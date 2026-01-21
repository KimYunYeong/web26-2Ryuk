import { Injectable, Logger, NotFoundException, ForbiddenException, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Server } from 'socket.io';
import { RedisClientType } from 'redis';
import { RoomService } from '@src/modules/room/room.service';
import { LOG, logMessage } from '@src/common/utils/log-messages';
import { REDIS_CLIENT } from '@src/providers/redis/redis.provider';
import { Game } from './game.entity';
import {
  GameListResponseDto,
  GameParticipantDto,
  GameInfoPayloadDto,
  GameSelectBroadcastDto,
  GameJoinAckResponseDto,
  GameHostDto,
  GamePlayerDto,
  GameReadyBroadcastDto,
  GameStartBroadcastDto,
  GameCloseBroadcastDto,
  GameRealtimeBroadcastDto,
} from './dto/game-response.dto';
import { WS_EVENTS_GAME } from '@src/common/constants/ws-events.constant';

@Injectable()
export class GameService {
  private readonly logger = new Logger(GameService.name);
  private readonly GAME_START_DELAY_MS = 3000;
  private readonly REALTIME_BROADCAST_INTERVAL_MS = 300; // 300ms 주기로 상태 브로드캐스트
  private realtimeBroadcastTimers: Map<string, NodeJS.Timeout> = new Map(); // 방별 브로드캐스트 타이머

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
    const roomExists = await this.roomService.roomExists(roomId);
    if (!roomExists) {
      throw new NotFoundException('존재하지 않는 방입니다.');
    }
    const isInRoom = await this.roomService.isUserInRoom(userId, roomId);
    if (!isInRoom) {
      throw new NotFoundException('해당 방에 참여하지 않았습니다.');
    }
    const isHost = await this.roomService.isHost(userId, roomId);
    if (!isHost) {
      throw new ForbiddenException('방장만 게임 모집을 시작할 수 있습니다.');
    }

    // Redis에 게임 모집 상태 저장
    const gameKey = this.getGameKey(roomId);
    await this.redisClient.hSet(gameKey, 'is_recruiting', '1');

    // 방장도 참가자 명단에 추가
    await this.addParticipant(roomId, userId);

    // 방장도 게임 준비 완료 상태로 설정
    const hostParticipantKey = this.getParticipantKey(roomId, userId);
    await this.redisClient.hSet(hostParticipantKey, 'is_ready', '1');

    // 해당 방의 모든 참여자에게 브로드캐스트
    server.to(roomId).emit(WS_EVENTS_GAME.PLAYER_RECRUIT, {
      is_game_recruiting: true,
    });

    logMessage(this.logger, LOG.GAME.RECRUIT_STARTED(roomId, userId));
  }

  /**
   * 게임 참가
   */
  async joinGame(server: Server, roomId: string, userId: string): Promise<GameJoinAckResponseDto> {
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

    // 게임 모집 중인지 확인
    const isRecruiting = await this.isGameRecruiting(roomId);
    if (!isRecruiting) {
      throw new ForbiddenException('게임 모집 중이 아닙니다.');
    }

    // 게임 참가자 명단에 추가. 새로 추가된 경우는 true 반환, 기존에 존재했으면 false 반환
    const wasAdded = await this.addParticipant(roomId, userId);

    const [roomInfo, participants, selectedGame] = await Promise.all([
      this.roomService.getRoom(roomId),
      this.getGameParticipants(roomId),
      this.getSelectedGame(roomId),
    ]);

    const currentPlayers = participants.length;

    const hostProfile = this.extractHostProfile(roomInfo.host_id, participants, roomInfo.participants);

    const players: GamePlayerDto[] = participants.map((participant) => ({
      user_id: participant.user_id,
      nickname: participant.nickname,
      profile_image: participant.profile_image,
      is_ready: participant.is_ready,
    }));

    // max_players는 선택된 게임의 최대 인원을 우선 사용, 없으면 방 최대 인원으로 대체
    const maxPlayers = selectedGame?.max_players ? parseInt(selectedGame.max_players, 10) : roomInfo.max_participants;

    const ackPayload = new GameJoinAckResponseDto(currentPlayers, maxPlayers, hostProfile, players, selectedGame);

    // 새로 추가된 경우에만 브로드캐스트
    if (wasAdded) {
      await this.broadcastGameJoin(server, roomId, userId, currentPlayers, participants);
    }

    logMessage(this.logger, LOG.GAME.JOIN_REQUEST(roomId, userId));

    return ackPayload;
  }

  /**
   * 게임 나가기
   */
  async leaveGame(server: Server, roomId: string, userId: string): Promise<void> {
    const playerKey = this.getParticipantKey(roomId, userId);
    const exists = await this.redisClient.exists(playerKey);

    if (exists) {
      await this.redisClient.del(playerKey);
      await this.redisClient.zRem(this.getScoreKey(roomId), userId);
      logMessage(this.logger, LOG.GAME.LEAVE(roomId, userId));

      // 남은 참여자 수 계산 및 브로드캐스트
      const currentPlayers = await this.getCurrentPlayers(roomId);
      server.to(roomId).emit(WS_EVENTS_GAME.PLAYER_LEAVE, {
        player_id: userId,
        current_players: currentPlayers,
      });
    }
  }

  /**
   * 게임 선택
   */
  async selectGame(server: Server, roomId: string, userId: string, gameId: string): Promise<GameInfoPayloadDto> {
    const roomExists = await this.roomService.roomExists(roomId);
    if (!roomExists) {
      throw new NotFoundException('존재하지 않는 방입니다.');
    }

    const isInRoom = await this.roomService.isUserInRoom(userId, roomId);
    if (!isInRoom) {
      throw new ForbiddenException('해당 방에 참여하지 않았습니다.');
    }

    const isHost = await this.roomService.isHost(userId, roomId);
    if (!isHost) {
      throw new ForbiddenException('방장만 게임을 선택할 수 있습니다.');
    }

    // db에서 게임 정보 조회
    const game = await this.gameRepository.findOne({ where: { id: gameId } });
    if (!game) {
      throw new NotFoundException('존재하지 않는 게임입니다.');
    }

    const broadcastPayload: GameInfoPayloadDto = {
      id: game.id,
      title: game.title,
      description: game.description || '',
      type: game.type,
      min_players: game.min_players?.toString() || '',
      max_players: game.max_players?.toString() || '',
    };

    // Redis에 선택된 게임 정보 저장
    // Redis는 인덱스 시그니처가 있는 단순 객체를 요구하므로 별도 캐시용 DTO 사용
    const cachePayload = {
      id: broadcastPayload.id,
      title: broadcastPayload.title,
      description: broadcastPayload.description || '',
      type: broadcastPayload.type,
      min_players: broadcastPayload.min_players,
      max_players: broadcastPayload.max_players,
    };
    await this.redisClient.hSet(this.getGameKey(roomId), cachePayload);

    const roomBroadcast: GameSelectBroadcastDto = { game: broadcastPayload };
    server.to(roomId).emit(WS_EVENTS_GAME.PLAYER_SELECT, roomBroadcast);

    logMessage(this.logger, LOG.GAME.SELECT(roomId, userId, gameId));

    return broadcastPayload;
  }

  /**
   * 게임 준비 완료
   */
  async readyGame(server: Server, roomId: string, userId: string): Promise<void> {
    const playerKey = this.getParticipantKey(roomId, userId);
    const exists = await this.redisClient.exists(playerKey);

    if (!exists) {
      throw new NotFoundException('게임 참가자 정보를 찾을 수 없습니다.');
    }

    // 선택된 게임 정보 조회
    const selectedGame = await this.getSelectedGame(roomId);
    if (selectedGame) {
      const maxPlayers = parseInt(selectedGame.max_players, 10);
      if (!isNaN(maxPlayers)) {
        // 현재 준비 완료한 참가자 수 조회 (본인 포함 전)
        const currentReadyPlayers = await this.getCurrentReadyPlayers(roomId);

        // 본인이 준비 완료하면 최대 인원을 초과하는지 확인
        if (currentReadyPlayers + 1 > maxPlayers) {
          throw new ForbiddenException('게임 최대 인원을 초과할 수 없습니다.');
        }
      }
    }

    await this.redisClient.hSet(playerKey, 'is_ready', '1');

    // 준비 완료 브로드캐스트
    const readyBroadcast: GameReadyBroadcastDto = {
      player_id: userId,
      is_ready: true,
    };
    server.to(roomId).emit(WS_EVENTS_GAME.PLAYER_READY, readyBroadcast);

    logMessage(this.logger, LOG.GAME.READY(roomId, userId));
  }

  /**
   * 게임 준비 해제
   */
  async unreadyGame(server: Server, roomId: string, userId: string): Promise<void> {
    const playerKey = this.getParticipantKey(roomId, userId);
    const exists = await this.redisClient.exists(playerKey);

    if (!exists) {
      throw new NotFoundException('게임 참가자 정보를 찾을 수 없습니다.');
    }

    await this.redisClient.hSet(playerKey, 'is_ready', '0');

    // 준비 해제 브로드캐스트
    const unreadyBroadcast: GameReadyBroadcastDto = {
      player_id: userId,
      is_ready: false,
    };
    server.to(roomId).emit(WS_EVENTS_GAME.PLAYER_UNREADY, unreadyBroadcast);

    logMessage(this.logger, LOG.GAME.UNREADY(roomId, userId));
  }

  /**
   * 게임 시작 (3초 지연 시작 시간 전달)
   */
  async startGame(server: Server, roomId: string, userId: string): Promise<string> {
    const roomExists = await this.roomService.roomExists(roomId);
    if (!roomExists) {
      throw new NotFoundException('존재하지 않는 방입니다.');
    }

    const isInRoom = await this.roomService.isUserInRoom(userId, roomId);
    if (!isInRoom) {
      throw new ForbiddenException('해당 방에 참여하지 않았습니다.');
    }

    const isHost = await this.roomService.isHost(userId, roomId);
    if (!isHost) {
      throw new ForbiddenException('방장만 게임을 시작할 수 있습니다.');
    }

    const selectedGame = await this.getSelectedGame(roomId);
    if (!selectedGame) {
      throw new NotFoundException('선택된 게임이 없습니다.');
    }

    const [currentReadyPlayers] = await Promise.all([this.getCurrentReadyPlayers(roomId)]);

    const minParticipants = parseInt(selectedGame.min_players, 10);
    if (!isNaN(minParticipants) && currentReadyPlayers < minParticipants) {
      throw new ForbiddenException('게임 최소 인원 조건을 충족하지 못했습니다.');
    }

    const startTime = this.clientStartTimeIso();

    // 시작 시각 및 모집 상태 캐싱: 더 이상 게임 참가 불가
    await this.redisClient.hSet(this.getGameKey(roomId), { start_time: startTime, is_recruiting: '0' });

    // 게임 준비 완료한 참가자들만 조회해서 점수 ZSET 초기화
    const pattern = `room:${roomId}:game:players:*`;
    const keys = await this.redisClient.keys(pattern);
    const scoreEntries: Array<{ score: number; value: string }> = [];
    for (const key of keys) {
      const isReady = await this.redisClient.hGet(key, 'is_ready');
      if (isReady === '1') {
        const userId = key.replace(`room:${roomId}:game:players:`, '');
        scoreEntries.push({ score: 0, value: userId });
      }
    }
    if (scoreEntries.length > 0) {
      await this.redisClient.zAdd(this.getScoreKey(roomId), scoreEntries);
    }

    const broadcast: GameStartBroadcastDto = { start_time: startTime };
    server.to(roomId).emit(WS_EVENTS_GAME.PLAYER_START, broadcast);

    logMessage(this.logger, LOG.GAME.START(roomId, userId, startTime));

    return startTime;
  }

  /**
   * 게임 닫기 (방장 전용)
   */
  async closeGame(server: Server, roomId: string, userId: string): Promise<void> {
    // 방 존재 여부 확인
    const roomExists = await this.roomService.roomExists(roomId);
    if (!roomExists) {
      throw new NotFoundException('존재하지 않는 방입니다.');
    }

    // 사용자가 방에 참여 중인지 확인
    const isInRoom = await this.roomService.isUserInRoom(userId, roomId);
    if (!isInRoom) {
      throw new ForbiddenException('해당 방에 참여하지 않았습니다.');
    }

    // 방장만 게임 모집 닫기 가능
    const isHost = await this.roomService.isHost(userId, roomId);
    if (!isHost) {
      throw new ForbiddenException('방장만 게임 모집을 닫을 수 있습니다.');
    }

    // 게임 시작 후에는 게임 닫기 불가능
    const gameKey = this.getGameKey(roomId);
    const startTime = await this.redisClient.hGet(gameKey, 'start_time');
    if (startTime) {
      throw new ForbiddenException('게임 시작 후에는 게임을 닫을 수 없습니다.');
    }

    // Redis에서 게임 모집 상태를 0으로 변경
    await this.redisClient.hSet(gameKey, 'is_recruiting', '0');

    // 게임 정보 삭제
    await this.redisClient.del(gameKey);
    await this.redisClient.del(this.getScoreKey(roomId));
    // 참가자 명단 삭제
    const pattern = `room:${roomId}:game:players:*`;
    const keys = await this.redisClient.keys(pattern);
    if (keys.length > 0) {
      await this.redisClient.del(keys);
    }

    // 해당 방의 모든 참여자에게 브로드캐스트
    server.to(roomId).emit(WS_EVENTS_GAME.PLAYER_CLOSE, new GameCloseBroadcastDto(false));

    logMessage(this.logger, LOG.GAME.CLOSE(roomId, userId));
  }

  // 🛠️🛠️🛠️🛠️🛠️🛠️🛠️🛠️🛠️🛠️🛠️🛠️🛠️🛠️🛠️🛠️🛠️🛠️🛠️ 헬퍼 함수 🛠️🛠️🛠️🛠️🛠️🛠️🛠️🛠️🛠️🛠️🛠️🛠️🛠️🛠️🛠️🛠️🛠️🛠️🛠️🛠️🛠️🛠️🛠️🛠️🛠️🛠️🛠️🛠️🛠️🛠️🛠️🛠️🛠️🛠️🛠️🛠️🛠️🛠️🛠️🛠️🛠️🛠️🛠️🛠️🛠️🛠️🛠️🛠️🛠️🛠️🛠️🛠️🛠️🛠️🛠️🛠️🛠️🛠️🛠️🛠️🛠️

  private getParticipantKey(roomId: string, userId: string): string {
    return `room:${roomId}:game:players:${userId}`;
  }

  private getScoreKey(roomId: string): string {
    return `room:${roomId}:game:scores`;
  }

  private getGameKey(roomId: string): string {
    return `room:${roomId}:game`;
  }

  private async isGameRecruiting(roomId: string): Promise<boolean> {
    const gameKey = this.getGameKey(roomId);
    const value = await this.redisClient.hGet(gameKey, 'is_recruiting');
    return value === '1';
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
      user_id: hostId,
      nickname: host?.nickname || '',
      profile_image: host?.profile_image || '',
    };
  }

  private async addParticipant(roomId: string, userId: string): Promise<boolean> {
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
        score: playerData.score || '0',
        rank: playerData.rank || '0',
      });
    }

    return participants;
  }

  private async getSelectedGame(roomId: string): Promise<GameInfoPayloadDto | undefined> {
    try {
      const gameKey = this.getGameKey(roomId);
      // Redis에서 조회만 수행 (selectGame에서 이미 저장됨)
      const gameData = await this.redisClient.hGetAll(gameKey);
      if (!gameData || Object.keys(gameData).length === 0) return undefined;
      if (!gameData.id) return undefined;

      // Redis에 저장된 게임 정보 반환
      const gamePayload: GameInfoPayloadDto = {
        id: gameData.id,
        title: gameData.title,
        description: gameData.description || '',
        type: gameData.type,
        min_players: gameData.min_players || '',
        max_players: gameData.max_players || '',
      };

      return gamePayload;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logMessage(this.logger, LOG.GAME.GAME_STATE_FETCH_ERROR(roomId, errorMessage));
      return undefined;
    }
  }

  async getCurrentPlayers(roomId: string): Promise<number> {
    const pattern = `room:${roomId}:game:players:*`;
    const keys = await this.redisClient.keys(pattern);
    return keys.length;
  }

  async getCurrentReadyPlayers(roomId: string): Promise<number> {
    const pattern = `room:${roomId}:game:players:*`;
    const keys = await this.redisClient.keys(pattern);

    let readyCount = 0;

    for (const key of keys) {
      const isReady = await this.redisClient.hGet(key, 'is_ready');
      if (isReady === '1') readyCount++;
    }

    return readyCount;
  }

  /**
   * 게임 실시간 입력 처리
   * - 클라이언트의 입력을 누적
   * - 300ms 주기로 배치하여 모든 사용자에게 상태 브로드캐스트
   *
   * @param server Socket.io 서버 인스턴스
   * @param roomId 방 ID
   * @param userId 사용자 ID
   * @param delta 누적된 변경 값
   */
  async handleRealtimeInput(server: Server, roomId: string, userId: string, delta: string): Promise<void> {
    try {
      // 방 존재 여부 확인
      const roomExists = await this.roomService.roomExists(roomId);
      if (!roomExists) {
        throw new NotFoundException('존재하지 않는 방입니다.');
      }

      // 사용자가 방에 참여 중인지 확인
      const isInRoom = await this.roomService.isUserInRoom(userId, roomId);
      if (!isInRoom) {
        throw new ForbiddenException('해당 방에 참여하지 않았습니다.');
      }

      // 게임 참가자인지 확인
      const playerKey = this.getParticipantKey(roomId, userId);
      const playerExists = await this.redisClient.exists(playerKey);
      if (!playerExists) {
        throw new ForbiddenException('게임 참가자가 아닙니다.');
      }

      // 게임 시작 여부 확인
      const gameKey = this.getGameKey(roomId);
      const startTime = await this.redisClient.hGet(gameKey, 'start_time');
      if (!startTime) {
        throw new ForbiddenException('게임이 시작되지 않았습니다.');
      }

      // delta 값 검증
      const deltaNum = parseInt(delta, 10);
      if (isNaN(deltaNum) || deltaNum < 0) {
        throw new Error('Invalid delta value');
      }

      // 현재 사용자의 점수 업데이트
      await this.updateParticipantScore(roomId, userId, deltaNum);

      // 300ms 주기 브로드캐스트 스케줄링
      this.scheduleRealtimeBroadcast(server, roomId);

      logMessage(this.logger, LOG.GAME.REALTIME_INPUT(roomId, userId, delta));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logMessage(this.logger, LOG.GAME.REALTIME_INPUT_ERROR(roomId, userId, errorMessage));
      throw error;
    }
  }

  private async updateParticipantScore(roomId: string, userId: string, deltaDelta: number): Promise<void> {
    const playerKey = this.getParticipantKey(roomId, userId);
    // zIncrBy는 없는 member에 대해 자동으로 0부터 시작하므로, 초기화 없이 첫 입력 시 자동으로 생성되게 할 수도 있어요
    // 점수 누적 -> 이후 랭킹/브로드캐스트용 정렬 데이터
    const newScore = await this.redisClient.zIncrBy(this.getScoreKey(roomId), deltaDelta, userId);
  }

  private clientStartTimeIso(): string {
    return new Date(Date.now() + this.GAME_START_DELAY_MS).toISOString();
  }

  private async broadcastGameJoin(
    server: Server,
    roomId: string,
    userId: string,
    currentPlayers: number,
    participants: GameParticipantDto[],
  ): Promise<void> {
    const joinedParticipant = participants.find((participant) => participant.user_id === userId);

    server.to(roomId).emit(WS_EVENTS_GAME.PLAYER_JOIN, {
      player: {
        user_id: joinedParticipant?.user_id || userId,
        nickname: joinedParticipant?.nickname || '',
        profile_image: joinedParticipant?.profile_image || '',
        is_ready: joinedParticipant?.is_ready ?? false,
      },
      current_players: currentPlayers.toString(),
    });
  }

  /**
   * 300ms 주기의 브로드캐스트 스케줄링
   * - 중복 스케줄링 방지
   * - 한 번 스케줄되면 주기마다 자동으로 상태 브로드캐스트
   */
  private scheduleRealtimeBroadcast(server: Server, roomId: string): void {
    const timerKey = `realtime:${roomId}`;

    // 이미 스케줄된 경우 추가 스케줄링 하지 않음
    if (this.realtimeBroadcastTimers.has(timerKey)) {
      return;
    }

    // 처음 스케줄링 시 타이머 설정
    const broadcastTimer = setInterval(async () => {
      try {
        await this.broadcastRealtimeState(server, roomId);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        this.logger.error(`브로드캐스트 중 오류: roomId=${roomId}, error=${errorMessage}`);
      }
    }, this.REALTIME_BROADCAST_INTERVAL_MS);

    this.realtimeBroadcastTimers.set(timerKey, broadcastTimer);
  }

  /**
   * 실시간 게임 상태 브로드캐스트
   * - 현재 최고 점수
   * - 평균 점수
   * - 현재 랭킹 순서
   */
  private async broadcastRealtimeState(server: Server, roomId: string): Promise<void> {
    try {
      // 점수 ZSET에서 모든 참가자 점수 조회 (내림차순)
      const scores = await this.redisClient.zRangeWithScores(this.getScoreKey(roomId), 0, -1, {
        REV: true,
      });

      if (scores.length === 0) {
        this.stopRealtimeBroadcast(roomId);
        return;
      }

      const highestScore = scores[0]?.score || 0;
      const totalScore = scores.reduce((sum, entry) => sum + entry.score, 0);
      const averageScore = (totalScore / scores.length).toFixed(2);
      const ranks = scores.map((entry) => entry.value);

      // 동점자 처리: 같은 점수는 같은 순위, 다음 순위는 건너뜀
      await this.updateParticipantRanksWithTies(roomId, scores);

      // 브로드캐스트
      const broadcast: GameRealtimeBroadcastDto = {
        highest_score: highestScore.toString(),
        average_score: averageScore,
        ranks,
      };

      server.to(roomId).emit(WS_EVENTS_GAME.PLAYER_REALTIME, broadcast);

      logMessage(this.logger, LOG.GAME.REALTIME_BROADCAST(roomId, highestScore, averageScore, ranks));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`실시간 상태 브로드캐스트 실패: roomId=${roomId}, error=${errorMessage}`);
      throw error;
    }
  }

  /**
   * 참가자 랭크 업데이트 (동점자 처리)
   */
  private async updateParticipantRanksWithTies(
    roomId: string,
    scores: Array<{ value: string; score: number }>,
  ): Promise<void> {
    let currentRank = 1;
    let previousScore: number | null = null;

    for (let i = 0; i < scores.length; i++) {
      const { value: userId, score } = scores[i];

      // 이전 점수와 다르면 현재 인덱스 기반으로 순위 갱신
      if (previousScore !== null && score !== previousScore) {
        currentRank = i + 1;
      }

      const playerKey = this.getParticipantKey(roomId, userId);
      await this.redisClient.hSet(playerKey, 'rank', currentRank.toString());

      previousScore = score;
    }
  }

  /**
   * 실시간 브로드캐스트 타이머 중지
   */
  public stopRealtimeBroadcast(roomId: string): void {
    const timerKey = `realtime:${roomId}`;
    const timer = this.realtimeBroadcastTimers.get(timerKey);

    if (timer) {
      clearInterval(timer);
      this.realtimeBroadcastTimers.delete(timerKey);
      logMessage(this.logger, LOG.GAME.REALTIME_BROADCAST_STOPPED(roomId));
    }
  }
}
