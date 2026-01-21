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
  CreateProducerDto,
  ProducerStateChangeDto,
} from './dto/voice.dto';
import { Socket } from 'socket.io';
import { RoomService } from '../room/room.service';
import { AuthService } from '../auth/auth.service';
import { createWsErrorResponse } from '@src/common/utils/ws-error-code';

interface SocketWithAuth extends Socket {
  data: {
    userId: string;
  };
}

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
  private async _authorizeClient(client: SocketWithAuth, roomId: string): Promise<string> {
    const { userId } = client.data;
    if (!userId) {
      throw new Error('UNAUTHORIZED');
    }

    const isUserInRoom = await this.roomService.isUserInRoom(userId, roomId);
    if (!isUserInRoom) {
      throw new Error('FORBIDDEN');
    }
    return userId;
  }

  /**
   * 클라이언트가 방의 Router의 RTP Capabilities를 요청할 때 처리
   */
  @SubscribeMessage('voice:router:capabilities')
  async handleGetRouterRtpCapabilities(
    @MessageBody() data: GetRouterRtpCapabilitiesDto,
    @ConnectedSocket() client: SocketWithAuth,
    ack: (response: any) => void,
  ) {
    if (typeof ack !== 'function') return;

    try {
      await this._authorizeClient(client, data.room_Id);
      const rtpCapabilities = await this.voiceService.getRouterRtpCapabilities(data.room_Id);
      ack({ data: { rtpCapabilities } });
    } catch (error) {
      const errorResponse = createWsErrorResponse(error, '라우터 기능 조회 중 오류가 발생했습니다.');
      ack({ error: errorResponse });
    }
  }

  /**
   * WebRTC Transport 생성
   */
  @SubscribeMessage('voice:transport:create')
  async handleCreateTransport(
    @MessageBody() data: VoiceTransportCreateDto,
    @ConnectedSocket() client: SocketWithAuth,
    ack: (response: any) => void,
  ) {
    if (typeof ack !== 'function') return;
    try {
      await this._authorizeClient(client, data.room_id);
      const transportInfo = await this.voiceService.createTransport(data.room_id, data.producing, client);
      ack({ data: transportInfo });
    } catch (error) {
      const errorResponse = createWsErrorResponse(error, 'WebRTC Transport 생성 중 오류가 발생했습니다.');
      ack({ error: errorResponse });
    }
  }

  /**
   * 클라이언트 Transport의 DTLS 파라미터를 받아 연결
   */
  @SubscribeMessage('voice:transport:connect')
  async handleConnectTransport(
    @MessageBody() data: VoiceTransportConnectDto,
    @ConnectedSocket() client: SocketWithAuth,
    ack: (response: any) => void,
  ) {
    if (typeof ack !== 'function') return;
    try {
      await this._authorizeClient(client, data.room_id);
      const result = await this.voiceService.connectTransport(data);
      ack({ data: result });
    } catch (error) {
      const errorResponse = createWsErrorResponse(error, 'WebRTC Transport 연결 중 오류가 발생했습니다.');
      ack({ error: errorResponse });
    }
  }

  /**
   * Producer 생성
   */
  @SubscribeMessage('voice:producer:create')
  async handleCreateProducer(
    @MessageBody() data: CreateProducerDto,
    @ConnectedSocket() client: SocketWithAuth,
    ack: (response: any) => void,
  ) {
    if (typeof ack !== 'function') return;
    try {
      const userId = await this._authorizeClient(client, data.room_id);
      const producer = await this.voiceService.createProducer(data, userId);

      ack({ data: { producer_id: producer.id } });

      // 다른 참여자들에게 새 producer 생성 알림
      client.to(data.room_id).emit('voice:producer:new', {
        producerUserId: userId,
        producerId: producer.id,
      });
    } catch (error) {
      const errorResponse = createWsErrorResponse(error, 'Producer 생성 중 오류가 발생했습니다.');
      ack({ error: errorResponse });
    }
  }

  /**
   * Producer 일시 중지
   */
  @SubscribeMessage('voice:producer:pause')
  async handlePauseProducer(
    @MessageBody() data: ProducerStateChangeDto,
    @ConnectedSocket() client: SocketWithAuth,
    ack: (response: any) => void,
  ) {
    if (typeof ack !== 'function') return;
    try {
      const userId = await this._authorizeClient(client, data.room_id);
      await this.voiceService.pauseProducer(data.producer_id, userId);

      ack({ data: { success: true } });

      // 다른 참여자들에게 상태 변경 알림
      client.to(data.room_id).emit('voice:producer:update', {
        user_id: userId,
        is_mic_on: 'false',
      });
    } catch (error) {
      const errorResponse = createWsErrorResponse(error, 'Producer 일시 중지 중 오류가 발생했습니다.');
      ack({ error: errorResponse });
    }
  }

  /**
   * Producer 재개
   */
  @SubscribeMessage('voice:producer:resume')
  async handleResumeProducer(
    @MessageBody() data: ProducerStateChangeDto,
    @ConnectedSocket() client: SocketWithAuth,
    ack: (response: any) => void,
  ) {
    if (typeof ack !== 'function') return;
    try {
      const userId = await this._authorizeClient(client, data.room_id);
      await this.voiceService.resumeProducer(data.producer_id, userId);

      ack({ data: { success: true } });

      // 다른 참여자들에게 상태 변경 알림
      client.to(data.room_id).emit('voice:producer:update', {
        user_id: userId,
        is_mic_on: 'true',
      });
    } catch (error) {
      const errorResponse = createWsErrorResponse(error, 'Producer 재개 중 오류가 발생했습니다.');
      ack({ error: errorResponse });
    }
  }

  /**
   * 클라이언트 Transport 종료
   * @param data room_id, transport_id
   * @param client Socket
   */
  @SubscribeMessage('voice:transport:close')
  async handleCloseTransport(
    @MessageBody() data: VoiceTransportCloseDto,
    @ConnectedSocket() client: SocketWithAuth,
    ack: (response: any) => void,
  ) {
    if (typeof ack !== 'function') return;
    try {
      await this._authorizeClient(client, data.room_id);
      const result = await this.voiceService.closeTransport(data);
      ack({ data: result });
    } catch (error) {
      const errorResponse = createWsErrorResponse(error, 'WebRTC Transport 종료 중 오류가 발생했습니다.');
      ack({ error: errorResponse });
    }
  }
}
