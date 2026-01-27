import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CurseWord } from './curse-word.entity';
import { RedisClientType } from 'redis';
import { REDIS_CLIENT } from '@src/providers/redis/redis.provider';
import { SanitizeResult } from './dto/curse-word-response.dto';

@Injectable()
export class CurseWordService implements OnModuleInit {
  private readonly logger = new Logger(CurseWordService.name);
  private readonly REDIS_SET_KEY = 'curseWord';
  private readonly MAX_RETRIES = 3;
  private readonly INITIAL_RETRY_DELAY_MS = 2000;
  private retryCount = 0;
  private cachedWords: string[] = [];
  private cachedPatterns: RegExp[] = [];

  constructor(
    @InjectRepository(CurseWord) private readonly curseWordRepository: Repository<CurseWord>,
    @Inject(REDIS_CLIENT) private readonly redisClient: RedisClientType,
  ) {}

  /**
   * 모듈 초기화 시 MySQL에서 Redis로 비속어 목록 적재 -> 실패 시 최대 3회까지 지수 백오프로 재시도
   * 모듈 초기화 시 비속어 리스트를 메모리에 캐싱
   */
  async onModuleInit(): Promise<void> {
    await this.loadWithRetry(0);
    await this.refreshCache();
  }

  /**
   * 메시지 내 비속어를 필터링하여 마스킹 처리
   * 중간에 특수문자나 숫자나 공백이 들어간 경우도 처리 (예: 바.보, 바 보, 바123보)
   * @param message 필터링할 메시지
   * @returns 필터링 결과
   */
  async sanitize(message: string): Promise<SanitizeResult> {
    if (!message) {
      return { sanitized: message, hasCurse: false };
    }
    // 캐시가 비어 있으면 갱신
    if (this.cachedWords.length === 0) {
      await this.refreshCache();
    }
    if (this.cachedWords.length === 0) {
      return { sanitized: message, hasCurse: false };
    }

    // 메시지 전처리 -> 숫자/특수문자/공백 제거하고 영어 때문에 소문자화 진행
    const original = message;
    const normalizedChars: string[] = [];
    const normToOrigIndex: number[] = [];
    for (let i = 0; i < original.length; i++) {
      const ch = original[i];
      // 영문자 또는 한글만 남김
      if (/[A-Za-z가-힣]/.test(ch)) {
        normalizedChars.push(ch.toLowerCase());
        normToOrigIndex.push(i);
      }
    }
    const normalized = normalizedChars.join('');
    if (normalized.length === 0) {
      return { sanitized: original, hasCurse: false };
    }

    // 정규화된 문자열에서 비속어 검색 (긴 단어 우선)
    const mask: boolean[] = new Array(original.length).fill(false);
    for (let idx = 0; idx < this.cachedWords.length; idx++) {
      const word = this.cachedWords[idx];
      if (!word) continue;
      const pattern = this.cachedPatterns[idx];
      let match: RegExpExecArray | null;
      pattern.lastIndex = 0; // lastIndex 초기화
      while ((match = pattern.exec(normalized)) !== null) {
        const startNorm = match.index;
        const endNorm = startNorm + word.length - 1;
        const startOrig = normToOrigIndex[startNorm];
        const endOrig = normToOrigIndex[endNorm];
        // 원본에서 해당 구간(사이에 끼어든 문자 포함)을 마스킹
        for (let i = startOrig; i <= endOrig; i++) mask[i] = true;
      }
    }

    // 마스킹 반영
    let hasCurse = mask.some(Boolean);
    const sanitized = hasCurse
      ? original
          .split('')
          .map((c, i) => (mask[i] ? '*' : c))
          .join('')
      : original;

    return { sanitized, hasCurse };
  }

  async loadFromMySQLToRedis(): Promise<void> {
    const items = await this.curseWordRepository.find({ select: ['word'] });
    const words = items.map((item) => item.word);
    await this.redisClient.del(this.REDIS_SET_KEY);
    if (words.length > 0) {
      await this.redisClient.sAdd(this.REDIS_SET_KEY, words);
    }
  }

  private async getWordsFromRedis(): Promise<string[]> {
    try {
      const members = await this.redisClient.sMembers(this.REDIS_SET_KEY);
      return members ?? [];
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      this.logger.error(`Redis에서 비속어 조회 실패: ${msg}`);
      return [];
    }
  }

  private async loadWithRetry(attempt: number): Promise<void> {
    try {
      await this.loadFromMySQLToRedis();
      this.logger.log('비속어 목록 초기 적재 완료 (MySQL -> Redis)');
      this.retryCount = 0;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      this.logger.warn(`비속어 Redis 적재 실패 (시도 ${attempt + 1}/${this.MAX_RETRIES}): ${msg}`);

      if (attempt < this.MAX_RETRIES - 1) {
        const delayMs = this.INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt);
        this.logger.log(`${delayMs}ms 후 재시도합니다...`);
        setTimeout(() => void this.loadWithRetry(attempt + 1), delayMs);
      } else {
        this.logger.error(`비속어 목록 적재 최종 실패 (${this.MAX_RETRIES}회 재시도)`);
      }
    }
  }

  private async refreshCache(): Promise<void> {
    const words = await this.getWordsFromRedis();
    // 긴 단어를 먼저 처리하도록 길이 기준 내림차순 정렬
    this.cachedWords = words.sort((a, b) => b.length - a.length);

    // 각 단어별 정규식 사전 컴파일
    this.cachedPatterns = this.cachedWords.map((word) => {
      const w = word.toLowerCase();
      return new RegExp(w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    });

    this.logger.log(`비속어 캐시 갱신 완료: ${this.cachedWords.length}건`);
  }
}
