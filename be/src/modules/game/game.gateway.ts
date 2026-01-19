import { WebSocketGateway, WebSocketServer, SubscribeMessage, ConnectedSocket, MessageBody } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, BadRequestException, UseFilters, UsePipes } from '@nestjs/common';
import { WsExceptionFilter } from '@src/common/filters/ws-exception.filter';
import { WsJsonParsePipe } from '@src/common/pipes/ws-json-parse.pipe';
import { ValidationPipe } from '@nestjs/common';
import { GameService } from './game.service';
import { GameRecruitDto } from './dto/game-recruit.dto';
import { createWsError, createWsErrorResponse } from '@src/common/utils/ws-error-code';

@UseFilters(new WsExceptionFilter())
@WebSocketGateway({ namespace: '/' })
@UsePipes(
  new WsJsonParsePipe(),
  new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: false,
    skipMissingProperties: false,
    transformOptions: {
      enableImplicitConversion: true,
    },
  }),
)
export class GameGateway {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(GameGateway.name);

  constructor(private readonly gameService: GameService) {}

  /**
   * 게임 플레이어 모집
   */
  @SubscribeMessage('game:recruit')
  async handleGameRecruit(@ConnectedSocket() client: Socket, @MessageBody() dto: GameRecruitDto) {
    try {
      const userId = client.data.userId;
      const isAuthenticated = client.data.authenticated;

      // 권한 검증: 인증되지 않은 사용자는 게임 모집 불가능
      if (!isAuthenticated || !userId) {
        client.emit('error', createWsError('UNAUTHORIZED', '인증이 필요합니다.'));
        return;
      }

      // 게임 모집 시작
      await this.gameService.startGameRecruiting(this.server, dto.room_id, userId);

      // 요청한 클라이언트에게 응답 전송
      client.emit('game:recruit', {
        room_id: dto.room_id,
      });
    } catch (error) {
      // 모든 예외를 일관되게 처리
      const errorResponse = createWsErrorResponse(error, '게임 모집 중 문제가 발생했습니다.');
      try {
        client.emit('error', errorResponse);
        return;
      } catch (emitError) {
        this.logger.warn('에러 메시지 전송 실패', emitError);
      }
    }
  }
}
