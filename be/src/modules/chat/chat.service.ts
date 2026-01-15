import { Injectable, Logger } from '@nestjs/common';
import { Server } from 'socket.io';
import { LOG, logMessage } from '@src/common/utils/log-messages';
import { GlobalChatMessageResponseDto, LocalChatMessageResponseDto } from './dto/chat-response.dto';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  /**
   * 글로벌 채팅 메시지 브로드캐스트
   * @param server Socket.io 서버 인스턴스
   * @param roomId 방 ID
   * @param userId 사용자 ID
   * @param message 메시지 내용
   * @param senderInfo 발신자 정보 (role, nickname, profile_image)
   * @param senderSocketId 메시지를 보낸 클라이언트의 socket ID
   */
  async broadcastGlobalChat(
    server: Server,
    roomId: string,
    userId: string,
    message: string,
    senderInfo: { role: string; nickname: string; profile_image: string | null },
    senderSocketId: string,
  ): Promise<void> {
    const timestamp = new Date().toISOString();

    // 메시지를 보낸 사용자에게는 is_me: true로 전송
    const responseToSender: GlobalChatMessageResponseDto = {
      event: 'chat:global:new-message',
      data: {
        message,
        sender: {
          role: senderInfo.role,
          nickname: senderInfo.nickname,
          profile_image: senderInfo.profile_image,
          is_me: true,
        },
        timestamp,
      },
    };

    // 다른 사용자들에게는 is_me: false로 전송
    const responseToOthers: GlobalChatMessageResponseDto = {
      event: 'chat:global:new-message',
      data: {
        message,
        sender: {
          role: senderInfo.role,
          nickname: senderInfo.nickname,
          profile_image: senderInfo.profile_image,
          is_me: false,
        },
        timestamp,
      },
    };

    // 메시지를 보낸 클라이언트에게만 is_me: true로 전송
    server.to(senderSocketId).emit(responseToSender.event, responseToSender.data);
    this.logger.debug(`메시지 발신자에게 전송: socketId=${senderSocketId}, is_me=true`);

    // 같은 방의 다른 클라이언트들에게는 is_me: false로 전송
    server.to(roomId).except(senderSocketId).emit(responseToOthers.event, responseToOthers.data);
    this.logger.debug(`다른 클라이언트들에게 브로드캐스트: roomId=${roomId}, except=${senderSocketId}, is_me=false`);

    logMessage(this.logger, LOG.CHAT.GLOBAL_BROADCAST(userId, message));
  }

  // 방 채팅 메시지 브로드캐스트
  async broadcastRoomChat(
    server: Server,
    roomId: string,
    userId: string,
    message: string,
    senderInfo: { role: string; nickname: string; profile_image: string | null },
    senderSocketId: string,
  ): Promise<void> {
    const timestamp = new Date().toISOString();

    // 메시지를 보낸 사용자에게는 is_me: true로 전송
    const responseToSender: LocalChatMessageResponseDto = {
      event: 'chat:room:new-message',
      data: {
        room_id: roomId,
        message,
        sender: {
          role: senderInfo.role,
          nickname: senderInfo.nickname,
          profile_image: senderInfo.profile_image,
          is_me: true,
        },
        timestamp,
      },
    };

    // 다른 사용자들에게는 is_me: false로 전송
    const responseToOthers: LocalChatMessageResponseDto = {
      event: 'chat:room:new-message',
      data: {
        room_id: roomId,
        message,
        sender: {
          role: senderInfo.role,
          nickname: senderInfo.nickname,
          profile_image: senderInfo.profile_image,
          is_me: false,
        },
        timestamp,
      },
    };

    // 메시지를 보낸 클라이언트에게만 is_me: true로 전송
    server.to(senderSocketId).emit(responseToSender.event, responseToSender.data);
    this.logger.debug(`메시지 발신자에게 전송: socketId=${senderSocketId}, is_me=true`);

    // 같은 방의 다른 클라이언트들에게는 is_me: false로 전송
    server.to(roomId).except(senderSocketId).emit(responseToOthers.event, responseToOthers.data);
    this.logger.debug(`다른 클라이언트들에게 브로드캐스트: roomId=${roomId}, except=${senderSocketId}, is_me=false`);

    logMessage(this.logger, LOG.CHAT.ROOM_BROADCAST(roomId, userId, message));
  }
}
