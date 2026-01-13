import {
  Controller,
  Post,
  Param,
  Body,
  Headers,
  UnauthorizedException,
  UsePipes,
  ValidationPipe,
  Logger,
} from '@nestjs/common';
import { RoomService } from './room.service';
import { JoinRoomRequestDto } from './dto/room.dto';
import { MockAuthService } from '../auth/mock-auth.service';
import { LOG, logMessage } from '@src/common/utils/log-messages';

@Controller('rooms')
export class RoomController {
  private readonly logger = new Logger(RoomController.name);

  constructor(
    private readonly roomService: RoomService,
    private readonly mockAuthService: MockAuthService,
  ) {}

  /**
   * 방 입장 가능 여부 검증
   * POST /api/rooms/:id/validate
   */
  @Post(':id/validate')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async validateJoin(
    @Param('id') roomId: string,
    @Body() dto: JoinRoomRequestDto,
    @Headers('authorization') authHeader?: string,
  ) {
    if (!authHeader) {
      logMessage(this.logger, LOG.ROOM.UNAUTH_API_ACCESS_JOIN(roomId));
      throw new UnauthorizedException('인증이 필요합니다.');
    }

    const token = authHeader.replace('Bearer ', '');
    const payload = this.mockAuthService.verifyMockToken(token);

    if (!payload) {
      logMessage(this.logger, LOG.ROOM.INVALID_TOKEN_API_JOIN(roomId));
      throw new UnauthorizedException('유효하지 않은 토큰입니다.');
    }

    await this.roomService.validateJoinRoom(roomId, payload.userId, dto.password);

    return { success: true, message: '입장 가능한 방입니다.' };
  }
}
