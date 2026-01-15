import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, Inject, UsePipes, ValidationPipe, BadRequestException, UseFilters } from '@nestjs/common';
import { WsExceptionFilter } from '@src/common/filters/ws-exception.filter';
import { WsJsonParsePipe } from '@src/common/pipes/ws-json-parse.pipe';
import { RoomService } from '@src/modules/room/room.service';
import { REDIS_CLIENT } from '@src/providers/redis/redis.provider';
import { RedisClientType } from 'redis';
import { LOG, logMessage } from '@src/common/utils/log-messages';
import { GLOBAL_ROOM_ID } from '@src/common/constants/constants';

@UseFilters(new WsExceptionFilter()) // 필터
@WebSocketGateway({ namespace: '/' })
@UsePipes(
  new WsJsonParsePipe(), // 문자열 JSON을 객체로 파싱
  new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: false, // WebSocket에서는 false로 설정
    skipMissingProperties: false,
    // exceptionFactory 제거: 기본 BadRequestException 사용
    transformOptions: {
      enableImplicitConversion: true,
    },
  }),
)
export class AppGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(AppGateway.name);

  constructor(
    private readonly roomService: RoomService,
    @Inject(REDIS_CLIENT) private readonly redisClient: RedisClientType,
  ) {}

  /**
   * 클라이언트 연결 처리
   * - 글로벌 채팅에 자동 참여 (Socket.io room 사용)
   */
  async handleConnection(@ConnectedSocket() client: Socket) {
    try {
      // 미들웨어(redis-io.adapter.ts)에서 이미 인증 처리가 완료되었으므로
      // socket.data에서 인증 정보를 가져옴
      // 미들웨어에서 헤더의 authentication도 처리하므로 여기서는 이미 설정된 값을 사용
      const userId = client.data.userId as string | undefined;
      const isAuthenticated = client.data.authenticated as boolean | undefined;

      // 디버깅: 인증 정보 확인
      this.logger.debug(`Connection - socketId: ${client.id}, userId: ${userId}, authenticated: ${isAuthenticated}`);

      // 연결 로그 (userId만 사용, MySQL 조회 없음)
      try {
        logMessage(this.logger, LOG.WS.CONNECT(client.id, userId));
      } catch (logError) {
        this.logger.warn('연결 로그 실패', logError);
      }

      // 글로벌 방 참여 로직
      const globalRoomId = GLOBAL_ROOM_ID;

      if (globalRoomId) {
        // Socket.io room 참여
        try {
          await client.join(globalRoomId);
          if (isAuthenticated && userId) {
            logMessage(this.logger, LOG.WS.SOCKET_IO_JOIN_AUTH(userId, globalRoomId));
          } else {
            logMessage(this.logger, LOG.WS.SOCKET_IO_JOIN_UNAUTH(client.id, globalRoomId));
          }
        } catch (joinError) {
          const errorMessage = joinError instanceof Error ? joinError.message : String(joinError);
          logMessage(this.logger, LOG.WS.SOCKET_IO_JOIN_ERROR(errorMessage));
        }

        // 인증된 사용자는 Redis 상태 업데이트
        if (isAuthenticated && userId) {
          try {
            const isInRoom = await this.roomService.isUserInRoom(userId, globalRoomId);
            if (!isInRoom) {
              await this.roomService.joinRoom(userId, globalRoomId);
              logMessage(this.logger, LOG.WS.REDIS_JOIN(userId, globalRoomId));
            }

            // 참여자 수 조회 및 브로드캐스트 (항상 최신 상태 전송)
            const currentParticipants = await this.roomService.getCurrentParticipants(globalRoomId);
            await this.roomService.notifyParticipantsUpdated(this.server, globalRoomId, currentParticipants);
          } catch (checkError) {
            const errorMessage = checkError instanceof Error ? checkError.message : String(checkError);
            logMessage(this.logger, LOG.WS.ROOM_PARTICIPATION_CHECK_ERROR(errorMessage));
          }
        }
      }

      // 최종 연결 상태 로그 (userId만 사용, MySQL 조회 없음)
      if (isAuthenticated && userId) {
        try {
          logMessage(this.logger, LOG.WS.AUTH_CONNECT(userId));
        } catch (logError) {
          this.logger.warn('인증 로그 실패', logError);
        }
      } else {
        try {
          logMessage(this.logger, LOG.WS.UNAUTH_CONNECT(client.id));
        } catch (logError) {
          this.logger.warn('비인증 로그 실패', logError);
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      logMessage(this.logger, LOG.WS.CONNECTION_HANDLE_ERROR(errorMessage, errorStack));
    }
  }

  // 웹소켓 연결 해제 처리
  async handleDisconnect(@ConnectedSocket() client: Socket) {
    const userId = client.data.userId;
    const isAuthenticated = client.data.authenticated;

    logMessage(this.logger, LOG.WS.DISCONNECT(client.id, userId));

    const globalRoomId = GLOBAL_ROOM_ID;

    // 인증된 사용자가 글로벌 방에 참여 중인 경우 참여자 수 업데이트 및 브로드캐스트
    if (isAuthenticated && userId && globalRoomId) {
      try {
        const isInRoom = await this.roomService.isUserInRoom(userId, globalRoomId);
        if (isInRoom) {
          // 글로벌 방에서 제거 (참여자 수 감소)
          await this.roomService.leaveRoom(userId, globalRoomId);

          // 참여자 수 조회 및 브로드캐스트 (인증된 사용자만 카운트)
          const currentParticipants = await this.roomService.getCurrentParticipants(globalRoomId);
          await this.roomService.notifyParticipantsUpdated(this.server, globalRoomId, currentParticipants);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logMessage(this.logger, LOG.WS.GLOBAL_ROOM_LEAVE_ERROR(errorMessage));
      }
    }

    // 모든 방에서 제거 (글로벌 방은 이미 처리됨)
    if (userId) {
      try {
        await this.roomService.leaveAllRooms(userId);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logMessage(this.logger, LOG.WS.GLOBAL_ROOM_LEAVE_ERROR(errorMessage));
      }
    }
  }

  /**
   * 로그아웃 처리
   * 인증 사용자 -> 익명 사용자 전환
   * WebSocket 연결은 유지하되, 참여자 수에서 제외
   */
  @SubscribeMessage('auth:logout')
  async handleLogout(@ConnectedSocket() client: Socket) {
    try {
      const userId = client.data.userId;
      const isAuthenticated = client.data.authenticated;

      // 인증된 사용자가 아닌 경우 early return
      if (!isAuthenticated || !userId) return;

      const globalRoomId = GLOBAL_ROOM_ID;
      if (!globalRoomId) return;

      const isInRoom = await this.roomService.isUserInRoom(userId, globalRoomId);
      if (!isInRoom) return;

      // 글로벌 방에서 제거 (참여자 수 감소)
      await this.roomService.leaveRoom(userId, globalRoomId);

      // 참여자 수 조회 및 브로드캐스트
      const currentParticipants = await this.roomService.getCurrentParticipants(globalRoomId);
      await this.roomService.notifyParticipantsUpdated(this.server, globalRoomId, currentParticipants);

      logMessage(this.logger, LOG.WS.LOGOUT(userId));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logMessage(this.logger, LOG.WS.LOGOUT_ERROR(errorMessage));
    }
  }
}
