import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  OnModuleInit,
  HttpStatus,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GLOBAL_ROOM_ID } from '@src/common/constants/constants';
import { RedisClientType } from 'redis';
import { LOG, logMessage } from '@src/common/utils/log-messages';
import { UUID } from 'crypto';
import { createHash } from 'crypto';
import { User } from '@src/modules/user/user.entity';
import { RoomRequestDto, RoomResponseDto, RoomDeleteResponseDto } from './dto/room.dto';
import { ROOM_TYPE, RoomType } from './room.type';
import { Server } from 'socket.io';

@Injectable()
export class RoomService implements OnModuleInit {
  private readonly logger = new Logger(RoomService.name);

  /**
   * Redis 클라이언트 설정
   */
  constructor(
    @Inject('REDIS_CLIENT') private readonly redisClient: RedisClientType,
    @InjectRepository(User) private readonly userRepository: Repository<User>,
  ) {}

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

  /**
   * 문자열을 UUID 형식으로 변환
   * 'J001' 같은 문자열을 일관된 UUID 문자열로 변환
   * 시드 스크립트와 동일한 변환 로직 사용
   */
  private stringToUuid(str: string): string {
    const hash = createHash('md5').update(str).digest('hex');
    const uuid = `${hash.substring(0, 8)}-${hash.substring(8, 12)}-${hash.substring(12, 16)}-${hash.substring(16, 20)}-${hash.substring(20, 32)}`;
    return uuid;
  }

  // 사용자 방 참여 처리
  async joinRoom(userId: string, roomId: string): Promise<void> {
    // Mock ID('J001' 형식)를 UUID로 변환
    const uuid = this.stringToUuid(userId);

    // MySQL에서 사용자 정보 조회 (Single Source of Truth)
    const user = await this.userRepository.findOne({
      where: { id: uuid },
      select: ['id', 'nickname', 'profile_image', 'role'],
    });

    if (!user) {
      throw new NotFoundException('사용자를 찾을 수 없습니다.');
    }

    // room:{roomId}:members Hash에 userId 추가 (참여 시간)
    await this.redisClient.hSet(`room:${roomId}:members`, userId, Date.now().toString());

    // room:{roomId}:members:{userId} Hash에 멤버 상세 정보 저장
    await this.redisClient.hSet(`room:${roomId}:members:${userId}`, {
      nickname: user.nickname,
      profile_image: user.profile_image || '',
      role: user.role || 'USER',
      is_mic_on: '0',
      is_audio_on: '1',
      is_speaking: '0',
      join_date: new Date().toISOString(),
    });

    // user:{userId}:rooms Set에 방 ID 추가
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
  async createRoom(hostId: string, roomData: RoomRequestDto): Promise<RoomResponseDto> {
    const id: UUID = crypto.randomUUID();
    const create_date = new Date();
    const tagKey = `room:${id}:tags`;

    if (roomData.max_participants <= 1) throw new HttpException('최대 참여자 수는 2명 이상이어야 합니다.', 400);

    await this.redisClient.hSet(`room:${id}`, {
      title: roomData.title,
      host_id: hostId,
      type: ROOM_TYPE.LOCAL,
      max_participants: roomData.max_participants.toString(),
      current_participants: '0',
      is_mic_available: roomData.is_mic_available ? '1' : '0',
      is_private: roomData.is_private ? '1' : '0',
      password: roomData.password || '',
      create_date: create_date.toISOString(),
    });

    if (roomData.tags && roomData.tags.length > 0) {
      await this.redisClient.sAdd(tagKey, roomData.tags);
    }

    this.joinRoom(hostId, id);
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

  /**
   * 방 정보 수정
   */
  async updateRoom(hostId: string, roomId: string, roomData: RoomRequestDto): Promise<RoomResponseDto> {
    const roomKey = `room:${roomId}`;
    const tagKey = `room:${roomId}:tags`;

    const existingHostId = await this.redisClient.hGet(roomKey, 'host_id');

    if (!existingHostId) throw new HttpException('존재하지 않는 방입니다.', 404);

    if (existingHostId !== hostId) throw new HttpException('방 수정 권한이 없습니다.', 403);

    if (roomData.max_participants <= 1) throw new HttpException('최대 참여자 수는 2명 이상이어야 합니다.', 400);

    await this.redisClient.hSet(roomKey, {
      title: roomData.title,
      max_participants: roomData.max_participants.toString(),
      is_mic_available: roomData.is_mic_available ? '1' : '0',
      is_private: roomData.is_private ? '1' : '0',
      password: roomData.password || '',
    });

    if (roomData.tags && roomData.tags.length > 0) {
      await this.redisClient.del(tagKey);
      await this.redisClient.sAdd(tagKey, roomData.tags);
    }

    logMessage(this.logger, LOG.ROOM.ROOM_UPDATED(roomId));

    const create_dateStr = await this.redisClient.hGet(roomKey, 'create_date');
    const create_date = create_dateStr ? new Date(create_dateStr) : new Date();

    return {
      id: roomId,
      title: roomData.title,
      tags: roomData.tags,
      max_participants: roomData.max_participants,
      is_mic_available: roomData.is_mic_available,
      is_private: roomData.is_private,
      create_date: create_date,
    };
  }

  async deleteRoom(hostId: string, roomId: string): Promise<RoomDeleteResponseDto> {
    const roomKey = `room:${roomId}`;
    const memberKey = `room:${roomId}:members`;
    const tagKey = `room:${roomId}:tags`;

    const [existingHostId, members] = await Promise.all([
      this.redisClient.hGet(roomKey, 'host_id'),
      this.redisClient.hKeys(memberKey), // 멤버 ID 목록 가져오기
    ]);

    if (!existingHostId) throw new HttpException('존재하지 않는 방입니다.', 404);

    if (existingHostId !== hostId) throw new HttpException('방 삭제 권한이 없습니다.', 403);

    // 방 정보 및 멤버 목록 삭제
    await Promise.all([
      ...members.map((userId) => this.redisClient.sRem(`user:${userId}:rooms`, roomId)),
      this.redisClient.del(roomKey),
      this.redisClient.del(memberKey),
      this.redisClient.del(tagKey),
    ]);

    logMessage(this.logger, LOG.ROOM.ROOM_DELETED(roomId));

    return { id: roomId };
  }

  // 방 존재 여부 확인
  async roomExists(roomId: string): Promise<boolean> {
    const exists = await this.redisClient.exists(`room:${roomId}`);
    return Boolean(exists);
  }

  /**
   * 방 입장 가능 여부 검증
   */
  async validateJoinRoom(roomId: string, userId: string, password?: string): Promise<void> {
    logMessage(this.logger, LOG.ROOM.VALIDATION_START(userId, roomId));

    try {
      // 방 존재 여부 확인
      const roomKey = `room:${roomId}`;
      const roomData = await this.redisClient.hGetAll(roomKey);

      if (!roomData || Object.keys(roomData).length === 0) {
        logMessage(this.logger, LOG.ROOM.VALIDATION_ERROR(userId, roomId, '존재하지 않는 방입니다.'));
        throw new NotFoundException('존재하지 않는 방입니다.');
      }

      // 이미 참여 중인지 확인
      const isInRoom = await this.isUserInRoom(userId, roomId);
      if (isInRoom) {
        logMessage(this.logger, LOG.ROOM.VALIDATION_ERROR(userId, roomId, '이미 참여 중인 사용자입니다.'));
        throw new ConflictException('이미 해당 방에 참여 중입니다.');
      }

      // 정원 확인 (GLOBAL 방 제외)
      if (roomData.type !== ROOM_TYPE.GLOBAL) {
        const currentParticipants = parseInt(roomData.current_participants || '0', 10);
        const maxParticipants = parseInt(roomData.max_participants || '0', 10);

        if (maxParticipants > 0 && currentParticipants >= maxParticipants) {
          logMessage(this.logger, LOG.ROOM.VALIDATION_ERROR(userId, roomId, '방 정원 초과'));
          throw new ForbiddenException('방 정원이 초과되었습니다.');
        }
      }

      // 비밀번호 확인
      if (roomData.is_private === '1') {
        if (!password || roomData.password !== password) {
          logMessage(this.logger, LOG.ROOM.VALIDATION_ERROR(userId, roomId, '비밀번호 불일치'));
          throw new ForbiddenException('비밀번호가 일치하지 않습니다.');
        }
      }

      logMessage(this.logger, LOG.ROOM.VALIDATION_SUCCESS(userId, roomId));
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      // Internal Server Error
      const errorMessage = error instanceof Error ? error.message : String(error);
      logMessage(this.logger, LOG.ROOM.INTERNAL_VALIDATION_ERROR(userId, roomId, errorMessage));
      throw new InternalServerErrorException('서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
    }
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

  // 로컬 방 전체 목록 조회
  async getLocalRooms(): Promise<
    Array<{
      id: string;
      title: string;
      tags: string[];
      current_participants: number;
      max_participants: number;
      is_mic_available: boolean;
      is_private: boolean;
      participant_profile_images: string[];
      create_date: string;
    }>
  > {
    try {
      const roomKeys = await this.redisClient.keys('room:*');

      // room:{roomId} 형식의 방 키만 필터링
      const mainRoomKeys = roomKeys.filter((key) => {
        const parts = key.split(':');
        return parts.length === 2;
      });

      const localRooms: Array<{
        id: string;
        title: string;
        tags: string[];
        current_participants: number;
        max_participants: number;
        is_mic_available: boolean;
        is_private: boolean;
        participant_profile_images: string[];
        create_date: string;
      }> = [];

      for (const roomKey of mainRoomKeys) {
        const roomId = roomKey.split(':')[1];

        const roomType = await this.getRoomType(roomId);
        if (roomType !== ROOM_TYPE.LOCAL) {
          continue;
        }

        const roomData = await this.redisClient.hGetAll(roomKey);
        if (!roomData || Object.keys(roomData).length === 0) {
          continue;
        }

        const tags = await this.redisClient.sMembers(`room:${roomId}:tags`);

        // 멤버 목록 조회
        const memberUserIds = await this.redisClient.hKeys(`room:${roomId}:members`);
        const participantProfileImages: string[] = [];

        // 프로필 이미지 -> UI에 5개만 표시
        const profileImageLimit = 5;
        for (const userId of memberUserIds.slice(0, profileImageLimit)) {
          try {
            const memberInfo = await this.redisClient.hGetAll(`room:${roomId}:members:${userId}`);
            if (memberInfo?.profile_image) {
              participantProfileImages.push(memberInfo.profile_image);
            }
          } catch (error) {
            this.logger.warn(`멤버 정보 조회 실패 (roomId: ${roomId}, userId: ${userId})`);
          }
        }

        localRooms.push({
          id: roomId,
          title: roomData.title || '',
          tags: tags || [],
          current_participants: parseInt(roomData.current_participants || '0', 10),
          max_participants: parseInt(roomData.max_participants || '0', 10),
          is_mic_available: roomData.is_mic_available === '1',
          is_private: roomData.is_private === '1',
          participant_profile_images: participantProfileImages,
          create_date: roomData.create_date || new Date().toISOString(),
        });
      }

      // 최신순 정렬
      localRooms.sort((a, b) => {
        const dateA = new Date(a.create_date).getTime();
        const dateB = new Date(b.create_date).getTime();
        return dateB - dateA;
      });

      return localRooms;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logMessage(this.logger, LOG.ROOM.LOCAL_ROOMS_FETCH_ERROR(errorMessage));
      throw new HttpException('서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // 로컬 방 검색 조회
  async searchLocalRooms(keyword: string): Promise<
    Array<{
      id: string;
      title: string;
      tags: string[];
      current_participants: number;
      max_participants: number;
      is_mic_available: boolean;
      is_private: boolean;
      participant_profile_images: string[];
      create_date: string;
    }>
  > {
    try {
      const allRooms = await this.getLocalRooms();
      // keyword가 없으면 모든 로컬 룸 반환
      if (!keyword || keyword.trim() === '') {
        return allRooms;
      }

      const searchKeyword = keyword.trim().toLowerCase();
      const filteredRooms = allRooms.filter((room) => {
        return room.title.toLowerCase().includes(searchKeyword);
      });

      return filteredRooms;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logMessage(this.logger, LOG.ROOM.LOCAL_ROOMS_SEARCH_ERROR(errorMessage));
      throw new HttpException('서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // 사용자 방 참여 알림 (다른 참여자에게)
  async notifyUserJoined(
    server: Server,
    roomId: string,
    userInfo: { userId: string; nickname: string; profile_image: string | null },
    currentParticipants: number,
  ): Promise<void> {
    const data = {
      roomId,
      user: {
        id: userInfo.userId,
        nickname: userInfo.nickname,
        profile_image: userInfo.profile_image,
      },
      current_participants: currentParticipants.toString(),
    };

    server.to(roomId).emit('room:user-joined', data);
  }

  // 사용자 방 퇴장 알림 (다른 참여자에게)
  async notifyUserLeft(server: Server, roomId: string, userId: string, currentParticipants: number): Promise<void> {
    const data = {
      roomId,
      userId,
      current_participants: currentParticipants.toString(),
    };

    server.to(roomId).emit('room:user-left', data);
    logMessage(this.logger, LOG.CHAT.USER_LEFT(roomId, userId));
  }

  // 글로벌 채팅 참여자 수 업데이트 브로드캐스트
  async notifyParticipantsUpdated(server: Server, roomId: string, currentParticipants: number): Promise<void> {
    const data = { roomId, current_participants: currentParticipants };

    // 글로벌 방의 경우 모든 클라이언트에게 브로드캐스트
    server.emit('chat:global:participants-updated', data);
    logMessage(this.logger, LOG.CHAT.PARTICIPANTS_UPDATED(roomId, currentParticipants));
  }
}
