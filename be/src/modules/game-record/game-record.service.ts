import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GameRecord } from '@src/modules/game-record/game-record.entity';
import { Game } from '@src/modules/game/game.entity';
import {
  GameRecordRankResponseDto,
  GameRecordRankItemDto,
} from '@src/modules/game-record/dto/game-record-response.dto';

@Injectable()
export class GameRecordService {
  private readonly logger = new Logger(GameRecordService.name);

  constructor(
    @InjectRepository(Game) private readonly gameRepository: Repository<Game>,
    @InjectRepository(GameRecord) private readonly gameRecordRepository: Repository<GameRecord>,
  ) {}

  /**
   * 게임 전체 랭킹 조회 (페이지네이션)
   * @param userId 로그인한 사용자 ID (null이면 비로그인)
   * @param gameId 게임 ID
   * @param page 쿼리 파라미터로 전달된 페이지 번호 (undefined면 명시적으로 전달되지 않음)
   * @param limit 페이지당 항목 수
   */
  async getGameRecordsRanking(
    userId: string | null,
    gameId: string,
    page: number | undefined,
    limit: number = 10,
  ): Promise<GameRecordRankResponseDto> {
    try {
      // 게임 존재 여부 확인
      const game = await this.gameRepository.findOne({ where: { id: gameId } });
      if (!game) {
        throw new NotFoundException('존재하지 않는 게임입니다.');
      }

      let gameRecord: GameRecord | null = null;
      let finalPage: number;

      // 전체 개수 조회
      const total = await this.gameRecordRepository.count({
        where: { game_id: gameId },
      });

      // 전체 레코드를 점수 내림차순으로 조회 (정확한 랭킹 계산을 위해)
      const allRecords = await this.gameRecordRepository.find({
        where: { game_id: gameId },
        relations: ['user'],
        order: { score: 'DESC' },
      });

      // 로그인 안 한 사용자인 경우 무조건 첫번째 페이지
      if (!userId) {
        finalPage = 1;
      } else {
        // 로그인 한 사용자의 경우 게임 기록 조회
        gameRecord = await this.gameRecordRepository.findOne({ where: { user_id: userId, game_id: gameId } });

        // 쿼리 파라미터로 page가 명시적으로 전달된 경우
        if (page !== undefined) {
          finalPage = page;
        } else {
          // 쿼리 파라미터가 없고 기록이 존재하면 내 랭킹 페이지 계산
          if (gameRecord && allRecords.length > 0) {
            const rank = allRecords.findIndex((record) => record.id === gameRecord!.id) + 1;
            finalPage = rank > 0 ? Math.ceil(rank / limit) : 1;
          } else {
            // 기록이 없으면 첫 페이지
            finalPage = 1;
          }
        }
      }

      if (allRecords.length === 0) {
        return {
          total,
          page: finalPage,
          records: [],
        };
      }

      // 페이지네이션 계산
      const start = (finalPage - 1) * limit;

      // 랭킹 계산 (동점자 처리: 같은 점수는 같은 순위, 다음 순위는 건너뜀)
      let currentRank = 1;
      let previousScore: number | null = null;

      const allRankItems: GameRecordRankItemDto[] = allRecords.map((record, index) => {
        const score = record.score;

        // 이전 점수와 다르면 현재 인덱스 기반으로 순위 갱신
        if (previousScore !== null && score !== previousScore) {
          currentRank = index + 1;
        }

        const rankItem: GameRecordRankItemDto = {
          user_id: record.user_id,
          nickname: record.user.nickname,
          profile_image: record.user.profile_image,
          score: record.score,
          rank: currentRank,
          achieve_date: record.achieve_date,
        };

        previousScore = score;
        return rankItem;
      });

      // 페이지네이션 적용
      const rankItems = allRankItems.slice(start, start + limit);

      return {
        total,
        page: finalPage,
        records: rankItems,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error('게임 랭킹 조회 중 오류 발생', error.stack);
      throw error;
    }
  }
}
