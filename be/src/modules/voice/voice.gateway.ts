import { SubscribeMessage, WebSocketGateway, MessageBody, ConnectedSocket } from '@nestjs/websockets';
import { VoiceService } from './voice.service';
import { UseFilters, UsePipes, ValidationPipe, Logger } from '@nestjs/common';
import { WsExceptionFilter } from '@src/common/filters/ws-exception.filter';
import { WsJsonParsePipe } from '@src/common/pipes/ws-json-parse.pipe';
import {
  GetRouterRtpCapabilitiesDto,
  VoiceTransportCreateDto,
  VoiceTransportConnectDto,
  VoiceTransportCloseDto,
} from './dto/voice.dto';
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
   * 클라이언트의 인증 및 인가(방 참여 여부)를 확인하는 헬퍼 메서드
   */
  private async _authorizeClient(client: Socket, roomId: string): Promise<string> {
    const { userId } = client.data;
    if (!userId) {
      client.emit('error', createWsError('UNAUTHORIZED', '인증이 필요합니다.'));
      throw new Error('UNAUTHORIZED'); // WsExceptionFilter가 이를 처리할 수 있도록 에러 던짐
    }

    const isUserInRoom = await this.roomService.isUserInRoom(userId, roomId);
    if (!isUserInRoom) {
      client.emit('error', createWsError('FORBIDDEN', '방에 참여하지 않은 사용자입니다.'));
      throw new Error('FORBIDDEN'); // WsExceptionFilter가 이를 처리할 수 있도록 에러 던짐
    }
    return userId;
  }

  /**
   * 공통 에러 처리 로직을 위한 헬퍼 메서드
   */
  private _handleError(error: any, client: Socket, defaultMessage: string): void {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;
    logMessage(this.logger, LOG.WS.VOICE_HANDLE_ERROR(errorMessage, errorStack));

    const errorResponse = createWsErrorResponse(error, defaultMessage);
    try {
      client.emit('error', errorResponse);
    } catch (emitError) {
      this.logger.warn('에러 메시지 전송 실패', emitError);
    }
  }

  /**
   * 클라이언트가 방의 Router의 RTP Capabilities를 요청할 때 처리
   */
  @SubscribeMessage('voice:router:capabilities')
  async handleGetRouterRtpCapabilities(
    @MessageBody() data: GetRouterRtpCapabilitiesDto,
    @ConnectedSocket() client: Socket,
  ) {
    try {
      await this._authorizeClient(client, data.room_Id);

      const rtpCapabilities = await this.voiceService.getRouterRtpCapabilities(data.room_Id);

      client.emit('voice:router:capabilities', {
        rtpCapabilities,
      });
    } catch (error) {
      this._handleError(error, client, '라우터 기능 조회 중 오류가 발생했습니다.');
    }
  }

  /**
   * WebRTC Transport 생성
   */
  @SubscribeMessage('voice:transport:create')
  async handleCreateTransport(@MessageBody() data: VoiceTransportCreateDto, @ConnectedSocket() client: Socket) {
    try {
      const userId = await this._authorizeClient(client, data.room_id);

      const transportInfo = await this.voiceService.createTransport(data.room_id, data.producing, client);

      client.emit('voice:transport:create', {
        id: transportInfo.id,
        ice_parameters: transportInfo.iceParameters,
        ice_candidates: transportInfo.iceCandidates,
        dtls_parameters: transportInfo.dtlsParameters,
      });
    } catch (error) {
      this._handleError(error, client, 'WebRTC Transport 생성 중 오류가 발생했습니다.');
    }
  }

  /**
   * 클라이언트 Transport의 DTLS 파라미터를 받아 연결
   */
  @SubscribeMessage('voice:transport:connect')
  async handleConnectTransport(@MessageBody() data: VoiceTransportConnectDto, @ConnectedSocket() client: Socket) {
    try {
      await this._authorizeClient(client, data.room_id);

      await this.voiceService.connectTransport(data);

      client.emit('voice:transport:connected', { transport_id: data.transport_id });
    } catch (error) {
      this._handleError(error, client, 'WebRTC Transport 연결 중 오류가 발생했습니다.');
    }
  }

  /**
   * 클라이언트 Transport 종료
   * @param data room_id, transport_id
   * @param client Socket
   */
  @SubscribeMessage('voice:transport:close')
  async handleCloseTransport(@MessageBody() data: VoiceTransportCloseDto, @ConnectedSocket() client: Socket) {
    try {
      await this._authorizeClient(client, data.room_id);

      await this.voiceService.closeTransport(data);

      client.emit('voice:transport:close', { success: true });
    } catch (error) {
      this._handleError(error, client, 'WebRTC Transport 종료 중 오류가 발생했습니다.');
    }
  }
}
