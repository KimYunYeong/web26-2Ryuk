import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CurseWord } from './curse-word.entity';
import { RedisClientType } from 'redis';
import { REDIS_CLIENT } from '@src/providers/redis/redis.provider';

interface SanitizeResult {
  sanitized: string;
  hasCurse: boolean;
}

@Injectable()
export class CurseWordService implements OnModuleInit {
  private readonly logger = new Logger(CurseWordService.name);
  private readonly REDIS_SET_KEY = 'curseWord';
  private readonly MAX_RETRIES = 3;
  private readonly INITIAL_RETRY_DELAY_MS = 2000;
  private retryCount = 0;

  constructor(
    @InjectRepository(CurseWord) private readonly curseWordRepository: Repository<CurseWord>,
    @Inject(REDIS_CLIENT) private readonly redisClient: RedisClientType,
  ) {}

  /**
   * 모듈 초기화 시 MySQL에서 Redis로 비속어 목록 적재
   * 실패 시 최대 3회까지 지수 백오프로 재시도
   */
  async onModuleInit(): Promise<void> {
    await this.loadWithRetry(0);
  }

  private async loadWithRetry(attempt: number): Promise<void> {
    try {
      await this.loadFromMySQLToRedis();
      this.logger.log('비속어 목록 초기 적재 완료 (MySQL -> Redis)');
      this.retryCount = 0; // 성공 시 재시도 횟수 리셋
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

  /**
   * 메시지 내 비속어를 필터링하여 마스킹 처리
   * @param message 필터링할 메시지
   * @returns 필터링 결과
   */
  async sanitize(message: string): Promise<SanitizeResult> {
    if (!message) {
      return { sanitized: message, hasCurse: false };
    }

    const curseWords = await this.getWordsFromRedis();
    if (curseWords.length === 0) {
      return { sanitized: message, hasCurse: false };
    }

    let sanitized = message;
    let hasCurse = false;

    for (const word of curseWords) {
      if (!word) continue;
      const pattern = new RegExp(word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      if (!pattern.test(sanitized)) continue;

      hasCurse = true;
      const mask = '*'.repeat(word.length);
      sanitized = sanitized.replace(pattern, mask);
    }

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
}
