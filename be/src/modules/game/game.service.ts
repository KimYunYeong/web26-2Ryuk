import { Injectable, Logger, NotFoundException, ForbiddenException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Server } from 'socket.io';
import { RedisClientType } from 'redis';
import { RoomService } from '@src/modules/room/room.service';
import { LOG, logMessage } from '@src/common/utils/log-messages';
import { REDIS_CLIENT } from '@src/providers/redis/redis.provider';
import { toUuid } from '@src/common/utils/user-id';
import { Game } from './game.entity';
import {
  GameListResponseDto,
  GameParticipantDto,
  GameInfoPayloadDto,
  GameJoinAckResponseDto,
  GameHostDto,
  GamePlayerDto,
} from './dto/game-response.dto';

@Injectable()
export class GameService {
  private readonly logger = new Logger(GameService.name);

  constructor(
    @Inject(forwardRef(() => RoomService)) private readonly roomService: RoomService,
    @InjectRepository(Game) private readonly gameRepository: Repository<Game>,
    @Inject(REDIS_CLIENT) private readonly redisClient: RedisClientType,
  ) {}

  /**
   * 전체 게임 목록 조회
   */
  async getAllGames(): Promise<GameListResponseDto> {
    try {
      const games = await this.gameRepository.find();
      return { games };
    } catch (error) {
      this.logger.error('게임 목록 조회 중 오류 발생', error.stack);
      throw error;
    }
  }

  /**
   * 게임 모집 시작
   * @param server Socket.io 서버 인스턴스
   * @param roomId 방 ID
   * @param userId 사용자 ID
   */
  async startGameRecruiting(server: Server, roomId: string, userId: string): Promise<void> {
    // 방 존재 여부 확인
    const roomExists = await this.roomService.roomExists(roomId);
    if (!roomExists) {
      throw new NotFoundException('존재하지 않는 방입니다.');
    }

    // 사용자가 방에 참여 중인지 확인
    const isInRoom = await this.roomService.isUserInRoom(userId, roomId);
    if (!isInRoom) {
      throw new NotFoundException('해당 방에 참여하지 않았습니다.');
    }

    // 호스트 권한 검증: 방장만 게임 모집 가능
    const isHost = await this.roomService.isHost(userId, roomId);
    if (!isHost) {
      throw new ForbiddenException('방장만 게임 모집을 시작할 수 있습니다.');
    }

    // 방장도 참가자 명단에 추가
    await this.addParticipant(roomId, toUuid(userId));

    // 해당 방의 모든 참여자에게 브로드캐스트
    server.to(roomId).emit('game:recruit', {
      is_game_recruiting: true,
    });

    logMessage(this.logger, LOG.GAME.RECRUIT_STARTED(roomId, userId));
  }

  /**
   * 게임 참가 처리 및 상태 반환
   */
  async joinGame(server: Server, roomId: string, userId: string): Promise<GameJoinAckResponseDto> {
    const uuid = toUuid(userId);

    logMessage(this.logger, LOG.GAME.JOIN_REQUEST(roomId, uuid));

    // 방 존재 여부
    const isRoomExists = await this.roomService.roomExists(roomId);
    if (!isRoomExists) {
      throw new NotFoundException('존재하지 않는 방입니다.');
    }
    // 사용자가 그 방 멤버인지 확인
    const isInRoom = await this.roomService.isUserInRoom(userId, roomId);
    if (!isInRoom) {
      throw new ForbiddenException('해당 방에 참여하지 않았습니다.');
    }

    // 게임 참가자 명단에 추가
    const wasAdded = await this.addParticipant(roomId, uuid);

    const [roomInfo, participants, selectedGame] = await Promise.all([
      this.roomService.getRoom(roomId),
      this.getGameParticipants(roomId),
      this.getSelectedGame(roomId),
    ]);

    const currentPlayers = participants.length;

    const hostProfile = this.extractHostProfile(roomInfo.host_id, participants, roomInfo.participants);

    const players: GamePlayerDto[] = participants.map((participant) => ({
      nickname: participant.nickname,
      profile_image: participant.profile_image,
      is_ready: participant.is_ready,
    }));

    const ackPayload = new GameJoinAckResponseDto(
      currentPlayers,
      roomInfo.current_participants,
      hostProfile,
      players,
      selectedGame,
    );

    // 새로 추가된 경우에만 브로드캐스트
    if (wasAdded) {
      await this.broadcastGameJoin(server, roomId, uuid, currentPlayers, participants);
    }

    return ackPayload;
  }

  private getParticipantKey(roomId: string, userId: string): string {
    return `room:${roomId}:game:players:${userId}`;
  }

  private async addParticipant(roomId: string, userId: string): Promise<boolean> {
    // 기존에 이미 추가된 참가자인지 확인
    const playerKey = this.getParticipantKey(roomId, userId);
    const exists = await this.redisClient.exists(playerKey);

    if (!exists) {
      // 방 멤버 정보에서 닉네임, 프로필 이미지 가져오기
      const memberData = await this.redisClient.hGetAll(`room:${roomId}:members:${userId}`);

      await this.redisClient.hSet(playerKey, {
        nickname: memberData.nickname || '',
        profile_image: memberData.profile_image || '',
        is_ready: '0',
        score: '0',
        rank: '0',
      });

      return true;
    }

    return false;
  }

  private async getGameParticipants(roomId: string): Promise<GameParticipantDto[]> {
    const pattern = `room:${roomId}:game:players:*`;
    const keys = await this.redisClient.keys(pattern);

    if (!keys.length) return [];

    const participants: GameParticipantDto[] = [];

    for (const key of keys) {
      const userId = key.replace(`room:${roomId}:game:players:`, '');
      const playerData = await this.redisClient.hGetAll(key);

      participants.push({
        user_id: userId,
        nickname: playerData.nickname || '',
        profile_image: playerData.profile_image || '',
        is_ready: playerData.is_ready === '1',
        score: playerData.score,
        rank: playerData.rank,
      });
    }

    return participants;
  }

  private extractHostProfile(
    hostId: string,
    participants: GameParticipantDto[],
    roomParticipants?: Array<{ user_id: string; nickname: string; profile_image: string }>,
  ): GameHostDto {
    const host =
      participants.find((participant) => participant.user_id === hostId) ||
      roomParticipants?.find((participant) => participant.user_id === hostId);

    return {
      nickname: host?.nickname || '',
      profile_image: host?.profile_image || '',
    };
  }

  private getGameKey(roomId: string): string {
    return `room:${roomId}:game`;
  }

  private async getSelectedGame(roomId: string): Promise<GameInfoPayloadDto | undefined> {
    try {
      const gameKey = this.getGameKey(roomId);
      // 우선 Redis에서 조회
      const gameData = await this.redisClient.hGetAll(gameKey);
      if (!gameData || Object.keys(gameData).length === 0) return undefined;

      // Redis에 id가 없다면 선택된 게임이 없는 것으로 간주 -> undefined
      if (!gameData.id) return undefined;

      // 선택된 게임의 모든 필드가 존재하는지 확인
      const hasAllFields =
        Boolean(gameData.title) &&
        Boolean(gameData.type) &&
        Boolean(gameData.min_participants) &&
        Boolean(gameData.max_participants);

      // 모든 필드가 존재하면 선택된 게임 정보 반환
      if (hasAllFields) {
        return {
          id: gameData.id,
          title: gameData.title,
          description: gameData.description,
          type: gameData.type,
          min_participants: gameData.min_participants,
          max_participants: gameData.max_participants,
        };
      }

      // 캐시 불완전 시 MySQL에서 보강 후 Redis에 다시 저장
      const dbGame = await this.gameRepository.findOne({ where: { id: gameData.id } });
      if (!dbGame) return undefined;

      // MySQL에서 조회한 게임 정보를 Redis에 저장
      await this.redisClient.hSet(gameKey, {
        id: dbGame.id,
        title: dbGame.title,
        description: dbGame.description || '',
        type: dbGame.type,
        min_participants: dbGame.min_participants?.toString() || '',
        max_participants: dbGame.max_participants?.toString() || '',
      });

      return {
        id: dbGame.id,
        title: dbGame.title,
        description: dbGame.description || '',
        type: dbGame.type,
        min_participants: dbGame.min_participants?.toString() || '',
        max_participants: dbGame.max_participants?.toString() || '',
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logMessage(this.logger, LOG.GAME.GAME_STATE_FETCH_ERROR(roomId, errorMessage));
      return undefined;
    }
  }

  private async broadcastGameJoin(
    server: Server,
    roomId: string,
    userId: string,
    participantCount: number,
    participants: GameParticipantDto[],
  ): Promise<void> {
    const joinedParticipant = participants.find((participant) => participant.user_id === userId);

    // 방의 다른 모든 사람에게 브로드캐스트 (본인 제외하지 않음, 전체 브로드캐스트)
    server.to(roomId).emit('game:joined', {
      participant: {
        user_id: joinedParticipant?.user_id || userId,
        nickname: joinedParticipant?.nickname || '',
        profile_image: joinedParticipant?.profile_image || '',
        is_ready: joinedParticipant?.is_ready ?? false,
      },
      participant_count: participantCount.toString(),
    });
  }

  async getParticipantCount(roomId: string): Promise<number> {
    const pattern = `room:${roomId}:game:players:*`;
    const keys = await this.redisClient.keys(pattern);
    return keys.length;
  }

  /**
   * 게임 참가 취소
   */
  async leaveGame(roomId: string, userId: string): Promise<void> {
    const uuid = toUuid(userId);
    const playerKey = this.getParticipantKey(roomId, uuid);
    const exists = await this.redisClient.exists(playerKey);

    if (exists) {
      await this.redisClient.del(playerKey);
      logMessage(this.logger, LOG.GAME.LEAVE(roomId, uuid));
    }
  }
}
