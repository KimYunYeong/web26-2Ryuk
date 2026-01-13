import { HttpException, Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { GLOBAL_ROOM_ID } from '@src/common/constants/constants';
import { LOG, logMessage } from '@src/common/utils/log-messages';
import { UUID } from 'crypto';
import { RedisClientType } from 'redis';
import { RoomCreateRequestDto, RoomResponseDto } from './dto/room.dto';
import { ROOM_TYPE, RoomType } from './room.type';

@Injectable()
export class RoomService implements OnModuleInit {
  private readonly logger = new Logger(RoomService.name);

  /**
   * Redis 클라이언트 설정
   */
  constructor(@Inject('REDIS_CLIENT') private readonly redisClient: RedisClientType) {}

  onModuleInit() {
    this.initializeGlobalRoom();
    logMessage(this.logger, LOG.ROOM.INITIALIZED);
  }

  private async initializeGlobalRoom() {
    const roomId = GLOBAL_ROOM_ID;
    const roomKey = `room:${roomId}`;

    try {
      const exists = await this.redisClient.exists(roomKey);

      if (!exists) {
        // room:{roomId} Hash에 방 정보 저장 (다른 메서드들과 일관성 유지)
        await this.redisClient.hSet(roomKey, {
          title: '전체 채팅방',
          type: ROOM_TYPE.GLOBAL,
          current_participants: '0',
          max_participants: '1000',
          create_date: new Date().toISOString(),
        });

        logMessage(this.logger, LOG.ROOM.GLOBAL_ROOM_INITIALIZED(roomId));
      }
    } catch (error) {
      logMessage(
        this.logger,
        LOG.ROOM.ERROR_INITIALIZING_GLOBAL_ROOM(error instanceof Error ? error.message : String(error)),
      );
    }
  }

  // 방 타입 조회
  async getRoomType(roomId: string): Promise<RoomType | null> {
    try {
      const type = await this.redisClient.hGet(`room:${roomId}`, 'type');
      return type === ROOM_TYPE.GLOBAL || type === ROOM_TYPE.LOCAL ? (type as RoomType) : null;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logMessage(this.logger, LOG.ROOM.ROOM_TYPE_FETCH_ERROR(roomId, errorMessage));
      return null;
    }
  }

  /**
   * 사용자가 방에 참여할 수 있는 권한 검증
   *
   * 현재는 모든 사용자가 모든 방에 참여 가능
   * 방 인원 수 제한, 비밀번호 검증 등의 로직이 필요하면 이 메서드 구현 필요
   */
  async canUserJoinRoom(userId: string, roomId: string): Promise<boolean> {
    logMessage(this.logger, LOG.ROOM.PERMISSION_CHECK(userId, roomId));

    // 글로벌이면 무조건 true
    if ((await this.getRoomType(roomId)) === ROOM_TYPE.GLOBAL) return true;

    // 방이 존재하는지 확인 (필요시 Redis에서 확인)
    // 방 인원 수 제한 확인 (필요시)
    // 비밀번호 검증 (필요시)

    return true;
  }

  // 사용자 방 참여 처리
  async joinRoom(userId: string, roomId: string): Promise<void> {
    // 방 멤버 목록에 추가 (Hash), 사용자의 참여 방 목록에 추가 (Set)
    await this.redisClient.hSet(`room:${roomId}:members`, userId, Date.now().toString());
    await this.redisClient.sAdd(`user:${userId}:rooms`, roomId);

    // 참여자 수 증가
    await this.increaseCurrentParticipants(roomId);
    logMessage(this.logger, LOG.ROOM.USER_JOINED(userId, roomId));
  }

  // 사용자 방 제거 처리
  async leaveRoom(userId: string, roomId: string): Promise<void> {
    // 방 멤버 목록에서 제거 (Hash), 사용자의 참여 방 목록에서 제거 (Set)
    await this.redisClient.hDel(`room:${roomId}:members`, userId);
    await this.redisClient.sRem(`user:${userId}:rooms`, roomId);

    // 참여자 수 감소
    await this.decreaseCurrentParticipants(roomId);
    logMessage(this.logger, LOG.ROOM.USER_LEFT(userId, roomId));
  }

  // 사용자 특정 방 참여 여부 확인
  async isUserInRoom(userId: string, roomId: string): Promise<boolean> {
    const exists = await this.redisClient.hExists(`room:${roomId}:members`, userId);
    return Boolean(exists);
  }

  // 사용자 참여 중인 모든 방 목록 조회 (글로벌 포함)
  async getUserRooms(userId: string): Promise<string[]> {
    const rooms = await this.redisClient.sMembers(`user:${userId}:rooms`);
    return rooms;
  }

  /**
   * 사용자 참여 중인 로컬 방 하나 조회 (글로벌 제외)
   * 요구사항: 글로벌 채팅 + 로컬 방 하나까지만 접속 가능
   */
  async getUserLocalRoom(userId: string): Promise<string | null> {
    const rooms = await this.getUserRooms(userId);

    // 각 방의 type을 확인하여 LOCAL 타입인 방 찾기 (Redis에서 읽어온 값)
    for (const roomId of rooms) {
      const roomType = await this.getRoomType(roomId);
      if (roomType === ROOM_TYPE.LOCAL) {
        return roomId;
      }
    }

    return null;
  }

  // 사용자가 참여 중인 GLOBAL 타입 방 조회
  async getUserGlobalRoom(userId: string): Promise<string | null> {
    return GLOBAL_ROOM_ID;

    // TODO: 추후 글로벌 방이 여러 개가 될 경우 구현 필요

    // const rooms = await this.getUserRooms(userId);

    // // 각 방의 type을 확인하여 GLOBAL 타입인 방 찾기 (Redis에서 읽어온 값)
    // for (const roomId of rooms) {
    //   const roomType = await this.getRoomType(roomId);
    //   if (roomType === 'GLOBAL') return roomId;
    // }

    // return null;
  }

  // 방의 모든 멤버 목록 조회
  async getRoomMembers(roomId: string): Promise<string[]> {
    const members = await this.redisClient.hKeys(`room:${roomId}:members`);
    return members;
  }

  // 사용자 연결 해제 시 모든 방에서 제거
  async leaveAllRooms(userId: string): Promise<void> {
    const rooms = await this.getUserRooms(userId);
    for (const roomId of rooms) {
      await this.leaveRoom(userId, roomId);
    }
  }

  // 사용자 방 호스트 여부 확인
  async isHost(userId: string, roomId: string): Promise<boolean> {
    const host = await this.redisClient.hGet(`room:${roomId}`, 'host_id');
    return host === userId;
  }

  /**
   * 방 생성 (Redis Hash에 방 정보 저장)
   * 개발용: 글로벌 룸 자동 생성에 사용
   */
  async createRoom(hostId: string, roomData: RoomCreateRequestDto): Promise<RoomResponseDto> {
    const id: UUID = crypto.randomUUID();
    const create_date = new Date();

    if (roomData.max_participants <= 0) throw new HttpException('최대 참여자 수는 1명 이상이어야 합니다.', 400);

    await this.redisClient.hSet(`room:${id}`, {
      title: roomData.title,
      tags: roomData.tags.join(','),
      host_id: hostId,
      type: ROOM_TYPE.LOCAL,
      max_participants: roomData.max_participants.toString(),
      current_participants: '0',
      is_mic_available: roomData.is_mic_available.toString(),
      is_private: roomData.is_private.toString(),
      password: roomData.password || '',
      create_date: create_date.toISOString(),
    });

    logMessage(this.logger, LOG.ROOM.ROOM_CREATED(id, ROOM_TYPE.LOCAL));

    return {
      id,
      title: roomData.title,
      tags: roomData.tags,
      max_participants: roomData.max_participants,
      is_mic_available: roomData.is_mic_available,
      is_private: roomData.is_private,
      create_date: create_date,
    };
  }

  // 방 존재 여부 확인
  async roomExists(roomId: string): Promise<boolean> {
    const exists = await this.redisClient.exists(`room:${roomId}`);
    return Boolean(exists);
  }

  // 방의 현재 참여자 수 증가
  async increaseCurrentParticipants(roomId: string): Promise<void> {
    try {
      await this.redisClient.hIncrBy(`room:${roomId}`, 'current_participants', 1);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logMessage(this.logger, LOG.ROOM.PARTICIPANTS_INCREASE_ERROR(roomId, errorMessage));
      throw error;
    }
  }

  // 방의 현재 참여자 수 감소
  async decreaseCurrentParticipants(roomId: string): Promise<void> {
    try {
      const current = await this.redisClient.hGet(`room:${roomId}`, 'current_participants');
      const count = parseInt(current || '0', 10);
      if (count > 0) await this.redisClient.hIncrBy(`room:${roomId}`, 'current_participants', -1);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logMessage(this.logger, LOG.ROOM.PARTICIPANTS_DECREASE_ERROR(roomId, errorMessage));
      throw error;
    }
  }

  // 방의 현재 참여자 수 조회
  async getCurrentParticipants(roomId: string): Promise<number> {
    try {
      const current = await this.redisClient.hGet(`room:${roomId}`, 'current_participants');
      return parseInt(current || '0', 10);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logMessage(this.logger, LOG.ROOM.PARTICIPANTS_FETCH_ERROR(roomId, errorMessage));
      return 0;
    }
  }
}
