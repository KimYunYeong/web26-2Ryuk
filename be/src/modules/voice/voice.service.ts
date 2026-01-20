import {
  Injectable,
  OnModuleInit,
  Logger,
  InternalServerErrorException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as mediasoup from 'mediasoup';
import { Worker, Router, RtpCodecCapability, WebRtcTransport, TransportListenIp } from 'mediasoup/node/lib/types';
import { LOG, logMessage } from '@src/common/utils/log-messages';
import { VoiceTransportConnectDto, VoiceTransportCloseDto } from './dto/voice.dto';
import { Socket } from 'socket.io';

/**
 * 서버(Router)에서 지원할 미디어 코덱 설정
 * 현재는 오디오에 Opus 코덱만 사용
 */
const mediaCodecs: RtpCodecCapability[] = [
  {
    kind: 'audio',
    mimeType: 'audio/opus',
    clockRate: 48000,
    channels: 2,
    preferredPayloadType: 111,
  },
];

@Injectable()
export class VoiceService implements OnModuleInit {
  private worker: Worker;
  // roomId를 키로 실제 mediasoup Router 객체를 저장하는 맵
  private routers: Map<string, Router> = new Map();
  // transportId를 키로 실제 mediasoup WebRtcTransport 객체를 저장하는 맵
  private transports: Map<string, WebRtcTransport> = new Map();

  private mediasoupListenIps: TransportListenIp[];
  private readonly logger = new Logger(VoiceService.name);

  constructor(private readonly configService: ConfigService) {}

  /**
   * 모듈 초기화 시 mediasoup Worker를 생성하고 IP 설정을 로드
   */
  async onModuleInit() {
    logMessage(this.logger, LOG.VOICE.CREATING_WORKER);
    const rtcMinPort = this.configService.get<number>('MEDIASOUP_RTC_MIN_PORT');
    const rtcMaxPort = this.configService.get<number>('MEDIASOUP_RTC_MAX_PORT');
    const announcedIp = this.configService.get<string>('MEDIASOUP_ANNOUNCED_IP');
    const listenIp = this.configService.get<string>('MEDIASOUP_LISTEN_IP');

    if (!rtcMinPort || !rtcMaxPort || !announcedIp || !listenIp) {
      throw new InternalServerErrorException(
        'Mediasoup environment variables (RTC ports, listen IP, announced IP) are not fully configured.',
      );
    }

    this.mediasoupListenIps = [
      {
        ip: listenIp,
        announcedIp: announcedIp,
      },
    ];

    this.worker = await mediasoup.createWorker({
      rtcMinPort: +rtcMinPort,
      rtcMaxPort: +rtcMaxPort,
      logLevel: 'debug',
      logTags: ['rtp', 'rtcp', 'rtx', 'bwe', 'score', 'simulcast', 'svc'],
    });

    this.worker.on('died', () => {
      logMessage(this.logger, LOG.VOICE.WORKER_DIED);
      process.exit(1);
    });

    logMessage(this.logger, LOG.VOICE.WORKER_CREATED(this.worker.pid));
  }

  /**
   * 특정 방(roomId)을 위한 Router를 생성하거나 기존 Router를 반환
   * Router는 특정 방의 모든 참여자 간의 미디어를 라우팅하는 역할
   */
  async getOrCreateRouter(roomId: string): Promise<Router> {
    if (this.routers.has(roomId)) {
      return this.routers.get(roomId)!;
    }

    const router = await this.worker.createRouter({ mediaCodecs });
    this.routers.set(roomId, router);

    router.on('@close', () => {
      this.routers.delete(roomId);
      logMessage(this.logger, LOG.VOICE.ROUTER_CLOSED(router.id, roomId));
    });

    logMessage(this.logger, LOG.VOICE.ROUTER_CREATED(router.id, roomId));
    return router;
  }

  /**
   * 특정 방의 Router의 RTP Capabilities를 조회
   * 클라이언트의 mediasoup Device 초기화에 필요한 정보를 제공
   */
  async getRouterRtpCapabilities(roomId: string) {
    const router = await this.getOrCreateRouter(roomId);
    return router.rtpCapabilities;
  }

  /**
   * 클라이언트의 WebRTC Transport를 생성
   * 이 Transport는 클라이언트와 mediasoup Router 간의 미디어 송수신 경로 역할
   */
  async createTransport(roomId: string, producing: boolean, client: Socket) {
    const router = await this.getOrCreateRouter(roomId);

    const appData = {
      roomId,
      producing,
      userId: client.data.userId,
    };

    const webRtcTransportOptions = {
      listenIps: this.mediasoupListenIps,
      enableUdp: true,
      enableTcp: true,
      preferUdp: true,
      initialAvailableOutgoingBitrate: 1000000, // 1 Mbps
      maxSctpMessageSize: 262144, // 256 KB
      enableSctp: false, // 음성 통화는 일반적으로 SCTP는 필요하지 않습니다.
      appData: appData,
    };

    let transport: WebRtcTransport;
    try {
      transport = await router.createWebRtcTransport(webRtcTransportOptions);
      this.transports.set(transport.id, transport); // Transport 객체를 로컬 맵에 저장
    } catch (error) {
      logMessage(
        this.logger,
        LOG.VOICE.TRANSPORT_CREATE_ERROR(roomId, producing, error instanceof Error ? error.message : String(error)),
      );
      throw new InternalServerErrorException('WebRTC Transport 생성 실패.');
    }

    // 송신용 Transport에 대한 최대 수신 비트레이트 설정 (QoS)
    if (producing) {
      try {
        await transport.setMaxIncomingBitrate(1500000); // 1.5 Mbps for producing
      } catch (error) {
        logMessage(
          this.logger,
          LOG.VOICE.TRANSPORT_SET_MAX_BITRATE_ERROR(roomId, error instanceof Error ? error.message : String(error)),
        );
      }
    }

    // Transport DTLS 연결 상태 변경 이벤트 처리
    // DTLS는 WebRTC의 보안 레이어를 담당하며, 상태 변화에 따라 적절한 조치(Transport 닫기)
    transport.on('dtlsstatechange', async (dtlsState) => {
      if (dtlsState === 'failed' || dtlsState === 'closed') {
        logMessage(this.logger, LOG.VOICE.TRANSPORT_DTLS_FAILED(transport.id, dtlsState));
        transport.close(); // DTLS 연결 실패 시 Transport 명시적으로 닫기
      }
    });

    // Transport 객체가 mediasoup에 의해 닫힐 때 로컬 맵에서 제거
    transport.on('@close', async () => {
      logMessage(this.logger, LOG.VOICE.TRANSPORT_CLOSED(transport.id));
      this.transports.delete(transport.id); // 로컬 맵에서 실제 Transport 객체 제거
    });

    // ICE Candidate 이벤트 처리
    // mediasoup Transport가 발견한 ICE 후보를 클라이언트에 전송하여 P2P 연결 경로를 설정하는 데 도움을 줌
    (transport as any).on('icecandidate', (candidate: any) => {
      logMessage(this.logger, LOG.VOICE.TRANSPORT_ICE_CANDIDATE(transport.id, JSON.stringify(candidate)));
      client.emit('voice:transport:ice-candidate', {
        transport_id: transport.id,
        candidate,
      });
    });

    logMessage(this.logger, LOG.VOICE.TRANSPORT_CREATED(transport.id, roomId, producing));

    return {
      id: transport.id,
      iceParameters: transport.iceParameters,
      iceCandidates: transport.iceCandidates,
      dtlsParameters: transport.dtlsParameters,
    };
  }

  /**
   * Transport ID와 방 ID를 통해 Transport 객체를 조회하고,
   * 로컬 존재 여부 및 방 소유권을 검증
   */
  private async _getAndValidateTransport(transportId: string, roomId: string): Promise<WebRtcTransport> {
    const transport = this.transports.get(transportId);
    if (!transport) {
      logMessage(this.logger, LOG.VOICE.TRANSPORT_NOT_FOUND(transportId));
      throw new NotFoundException(`Transport with ID "${transportId}" not found.`);
    }

    // 전송하려는 transport가 요청된 방에 속하는지 검증 (appData와 DTO 비교)
    if ((transport.appData as { roomId: string }).roomId !== roomId) {
      logMessage(
        this.logger,
        LOG.VOICE.TRANSPORT_ROOM_MISMATCH(transportId, (transport.appData as { roomId: string }).roomId, roomId),
      );
      throw new ForbiddenException(`Transport with ID "${transportId}" does not belong to room "${roomId}".`);
    }
    return transport;
  }

  /**
   * 클라이언트의 WebRTC Transport를 서버 측 Transport와 연결
   * 클라이언트에서 보낸 DTLS 파라미터를 사용하여 Transport의 DTLS 핸드셰이크를 완료하고,
   * 요청된 Transport가 올바른 방에 속하는지 검증
   */
  async connectTransport(dto: VoiceTransportConnectDto) {
    const transport = await this._getAndValidateTransport(dto.transport_id, dto.room_id);
    await transport.connect({ dtlsParameters: dto.dtls_parameters });
    logMessage(this.logger, LOG.VOICE.TRANSPORT_CONNECTED(transport.id));
  }

  /**
   * 클라이언트의 WebRTC Transport를 종료하고 관련 리소스 정리
   * Transport 객체 닫힘 이벤트에 로컬 맵 메타데이터 정리 로직 연결
   */
  async closeTransport(dto: VoiceTransportCloseDto) {
    const transport = await this._getAndValidateTransport(dto.transport_id, dto.room_id);
    transport.close(); // mediasoup Transport 객체를 닫으면 '@close' 이벤트가 발생하고, 해당 리스너가 로컬 맵에서 정리
    logMessage(this.logger, LOG.VOICE.TRANSPORT_CLOSED(transport.id));
  }

  /**
   * 특정 방의 Router를 닫고 관련 리소스를 정리
   * Router 객체 닫힘 이벤트에 로컬 맵 정리 로직 연결
   */
  async closeRouter(roomId: string) {
    const router = this.routers.get(roomId);
    if (!router) {
      return;
    }
    router.close(); // mediasoup Router 객체를 닫으면 '@close' 이벤트가 발생하고, 해당 리스너가 로컬 맵에서 정리
    logMessage(this.logger, LOG.VOICE.ROUTER_CLOSED(router.id, roomId));
  }
}
