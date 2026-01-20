import { SubscribeMessage, WebSocketGateway, MessageBody, ConnectedSocket } from '@nestjs/websockets';
import { VoiceService } from './voice.service';
import { UseFilters, UsePipes, ValidationPipe, Logger } from '@nestjs/common';
import { WsExceptionFilter } from '@src/common/filters/ws-exception.filter';
import { WsJsonParsePipe } from '@src/common/pipes/ws-json-parse.pipe';
import { GetRouterRtpCapabilitiesDto } from './dto/voice.dto';
import { Socket } from 'socket.io';
import { RoomService } from '../room/room.service';
import { AuthService } from '../auth/auth.service';
import { createWsError, createWsErrorResponse } from '@src/common/utils/ws-error-code';
import { LOG, logMessage } from '@src/common/utils/log-messages';

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
export class VoiceGateway {
  private readonly logger = new Logger(VoiceGateway.name);

  constructor(
    private readonly voiceService: VoiceService,
    private readonly roomService: RoomService,
    private readonly authService: AuthService,
  ) {}

  /**
   * 클라이언트가 방의 Router의 RTP Capabilities를 요청할 때 처리
   *
   * WebRTC 연결의 첫 단계
   * 클라이언트는 서버(Router)가 어떤 미디어 코덱과 파라미터를 지원하는지 알아야함
   * 이 정보를 받아 클라이언트 측의 mediasoup Device를 초기화
   */
  @SubscribeMessage('voice:router:capabilities')
  async handleGetRouterRtpCapabilities(
    @MessageBody() data: GetRouterRtpCapabilitiesDto,
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const { userId } = client.data;
      if (!userId) {
        client.emit('error', createWsError('UNAUTHORIZED', '인증이 필요합니다.'));
        return;
      }

      // 방에 참여한 사용자인지 확인 (인가)
      const isUserInRoom = await this.roomService.isUserInRoom(userId, data.room_Id);
      if (!isUserInRoom) {
        client.emit('error', createWsError('FORBIDDEN', '방에 참여하지 않은 사용자입니다.'));
        return;
      }

      // VoiceService를 통해 Router의 RTP Capabilities 조회
      const rtpCapabilities = await this.voiceService.getRouterRtpCapabilities(data.room_Id);

      // 클라이언트에게 RTP Capabilities 정보 전송
      client.emit('voice:router:capabilities', {
        rtpCapabilities,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? error.stack : undefined;
      logMessage(this.logger, LOG.WS.VOICE_HANDLE_ERROR(errorMessage, errorStack));
      const errorResponse = createWsErrorResponse(error, '라우터 기능 조회 중 오류가 발생했습니다.');
      client.emit('error', errorResponse);
    }
  }
}
