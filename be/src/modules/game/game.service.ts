import { Injectable, Logger, NotFoundException, ForbiddenException } from '@nestjs/common';
import { Server } from 'socket.io';
import { RoomService } from '@src/modules/room/room.service';
import { LOG, logMessage } from '@src/common/utils/log-messages';

@Injectable()
export class GameService {
  private readonly logger = new Logger(GameService.name);

  constructor(private readonly roomService: RoomService) {}

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

    // 해당 방의 모든 참여자에게 브로드캐스트
    server.to(roomId).emit('game:recruit', {
      is_game_recruiting: true,
    });

    logMessage(this.logger, LOG.GAME.RECRUIT_STARTED(roomId, userId));
  }
}
