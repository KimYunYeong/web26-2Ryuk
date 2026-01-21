import {
  Injectable,
  OnModuleInit,
  Logger,
  InternalServerErrorException,
  NotFoundException,
  ForbiddenException,
  Inject,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as mediasoup from 'mediasoup';
import {
  Worker,
  Router,
  RtpCodecCapability,
  WebRtcTransport,
  TransportListenIp,
  Producer,
} from 'mediasoup/node/lib/types';
import { LOG, logMessage } from '@src/common/utils/log-messages';
import { VoiceTransportConnectDto, VoiceTransportCloseDto, CreateProducerDto } from './dto/voice.dto';
import { Socket } from 'socket.io';
import { REDIS_CLIENT } from '@src/providers/redis/redis.provider';
import { RedisClientType } from 'redis';

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

interface SocketWithAuth extends Socket {
  data: {
    userId: string;
  };
}

@Injectable()
export class VoiceService implements OnModuleInit {
  private worker: Worker;
  // roomId를 키로 실제 mediasoup Router 객체를 저장하는 맵 (프로세스 메모리)
  private routers: Map<string, Router> = new Map();
  // transportId를 키로 실제 mediasoup WebRtcTransport 객체를 저장하는 맵 (프로세스 메모리)
  private transports: Map<string, WebRtcTransport> = new Map();
  // producerId를 키로 실제 mediasoup Producer 객체를 저장하는 맵 (프로세스 메모리)
  private producers: Map<string, Producer> = new Map();

  private mediasoupListenIps: TransportListenIp[];
  private readonly logger = new Logger(VoiceService.name);

  constructor(
    private readonly configService: ConfigService,
    @Inject(REDIS_CLIENT) private readonly redisClient: RedisClientType,
  ) {}

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
      throw new InternalServerErrorException(LOG.VOICE.MEDIASOUP_CONFIG_ERROR.message);
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
    const existingRouter = this.routers.get(roomId);
    if (existingRouter) {
      return existingRouter;
    }

    const routerDataFromRedis = await this.redisClient.hGetAll(`mediasoup:router:${roomId}`);
    if (Object.keys(routerDataFromRedis).length > 0) {
      logMessage(this.logger, LOG.VOICE.ROUTER_IN_REDIS_NOT_IN_MEMORY(routerDataFromRedis.id, roomId));
    }

    const router = await this.worker.createRouter({ mediaCodecs });
    this.routers.set(roomId, router);

    this.redisClient
      .hSet(`mediasoup:router:${roomId}`, {
        id: router.id,
        worker_pid: this.worker.pid.toString(),
      })
      .catch((err) => logMessage(this.logger, LOG.VOICE.REDIS_CLEANUP_ERROR(router.id, err)));

    router.on('@close', () => {
      this.routers.delete(roomId);
      this.redisClient
        .del(`mediasoup:router:${roomId}`)
        .catch((err) => logMessage(this.logger, LOG.VOICE.REDIS_CLEANUP_ERROR(router.id, err)));
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
  async createTransport(roomId: string, producing: boolean, client: SocketWithAuth) {
    const router = await this.getOrCreateRouter(roomId);
    const userId = client.data.userId;

    const webRtcTransportOptions = {
      listenIps: this.mediasoupListenIps,
      enableUdp: true,
      enableTcp: true,
      preferUdp: true,
      initialAvailableOutgoingBitrate: 1000000,
      maxSctpMessageSize: 262144,
      enableSctp: false,
      appData: { roomId, producing, userId },
    };

    const transport = await router.createWebRtcTransport(webRtcTransportOptions);
    this.transports.set(transport.id, transport);

    Promise.all([
      this.redisClient.hSet(`mediasoup:transport:${transport.id}`, {
        room_id: roomId,
        user_id: userId,
        producing: producing.toString(),
        socket_id: client.id,
      }),
      this.redisClient.sAdd(`mediasoup:room:${roomId}:user:${userId}:transports`, transport.id),
    ]).catch((err) => logMessage(this.logger, LOG.VOICE.REDIS_CLEANUP_ERROR(transport.id, err)));

    transport.on('@close', () => {
      this.transports.delete(transport.id);
      Promise.all([
        this.redisClient.del(`mediasoup:transport:${transport.id}`),
        this.redisClient.sRem(`mediasoup:room:${roomId}:user:${userId}:transports`, transport.id),
      ]).catch((err) => logMessage(this.logger, LOG.VOICE.REDIS_CLEANUP_ERROR(transport.id, err)));
      logMessage(this.logger, LOG.VOICE.TRANSPORT_CLOSED(transport.id));
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
    const transportData = await this.redisClient.hGetAll(`mediasoup:transport:${transportId}`);
    if (Object.keys(transportData).length === 0) {
      logMessage(this.logger, LOG.VOICE.TRANSPORT_NOT_FOUND(transportId));
      throw new NotFoundException(LOG.VOICE.TRANSPORT_NOT_FOUND_REDIS(transportId).message);
    }

    if (transportData.room_id !== roomId) {
      logMessage(this.logger, LOG.VOICE.TRANSPORT_ROOM_MISMATCH(transportId, transportData.room_id, roomId));
      throw new ForbiddenException(LOG.VOICE.TRANSPORT_ROOM_FORBIDDEN(transportId, roomId).message);
    }

    const transport = this.transports.get(transportId);
    if (!transport) {
      logMessage(this.logger, LOG.VOICE.TRANSPORT_IN_REDIS_NOT_IN_MEMORY(transportId));
      throw new InternalServerErrorException(LOG.VOICE.TRANSPORT_IN_REDIS_NOT_IN_MEMORY(transportId).message);
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
    return { transport_id: dto.transport_id };
  }

  /**
   * 오디오/비디오 스트림을 서버로 전송하기 위한 Producer 생성
   */
  async createProducer(dto: CreateProducerDto, userId: string): Promise<Producer> {
    const { room_id, transport_id, kind, rtp_parameters } = dto;
    const transport = await this._getAndValidateTransport(transport_id, room_id);

    const transportData = await this.redisClient.hGetAll(`mediasoup:transport:${transport.id}`);
    if (transportData.producing !== 'true') {
      throw new BadRequestException(LOG.VOICE.TRANSPORT_NOT_FOR_PRODUCING(transport.id).message);
    }

    const producer = await transport.produce({
      kind,
      rtpParameters: rtp_parameters,
      appData: { roomId: room_id, userId, transportId: transport_id },
    });
    this.producers.set(producer.id, producer);

    // Redis에 Producer 메타데이터 저장
    Promise.all([
      this.redisClient.hSet(`mediasoup:producer:${producer.id}`, {
        room_id,
        user_id: userId,
        kind,
        transport_id,
        rtp_parameters: JSON.stringify(rtp_parameters),
        paused: 'false',
      }),
      this.redisClient.sAdd(`mediasoup:room:${room_id}:user:${userId}:producers`, producer.id),
    ]).catch((err) => logMessage(this.logger, LOG.VOICE.REDIS_CLEANUP_ERROR(producer.id, err)));

    producer.on('@close', () => {
      this.producers.delete(producer.id);
      Promise.all([
        this.redisClient.del(`mediasoup:producer:${producer.id}`),
        this.redisClient.sRem(`mediasoup:room:${room_id}:user:${userId}:producers`, producer.id),
      ]).catch((err) => logMessage(this.logger, LOG.VOICE.REDIS_CLEANUP_ERROR(producer.id, err)));
    });

    logMessage(this.logger, LOG.VOICE.PRODUCER_CREATED(producer.id, transport.id, userId));

    return producer;
  }

  /**
   * Producer 객체를 조회하고 소유권을 검증
   */
  private async _getAndValidateProducer(producerId: string, userId: string): Promise<Producer> {
    const producer = this.producers.get(producerId);
    if (!producer) {
      logMessage(this.logger, LOG.VOICE.PRODUCER_NOT_FOUND(producerId));
      throw new NotFoundException(LOG.VOICE.PRODUCER_NOT_FOUND(producerId).message);
    }

    const producerData = await this.redisClient.hGetAll(`mediasoup:producer:${producerId}`);
    if (producerData.user_id !== userId) {
      logMessage(this.logger, LOG.VOICE.PRODUCER_OWNERSHIP_MISMATCH(producerId, producerData.user_id, userId));
      throw new ForbiddenException(
        LOG.VOICE.PRODUCER_OWNERSHIP_MISMATCH(producerId, producerData.user_id, userId).message,
      );
    }
    return producer;
  }

  /**
   * Producer의 일시 중지/재개 상태를 변경
   */
  private async _setProducerPausedState(producerId: string, userId: string, pause: boolean): Promise<void> {
    const producer = await this._getAndValidateProducer(producerId, userId);

    if (pause) {
      await producer.pause();
      await this.redisClient.hSet(`mediasoup:producer:${producerId}`, 'paused', 'true');
      logMessage(this.logger, LOG.VOICE.PRODUCER_PAUSED(producerId, userId));
    } else {
      await producer.resume();
      await this.redisClient.hSet(`mediasoup:producer:${producerId}`, 'paused', 'false');
      logMessage(this.logger, LOG.VOICE.PRODUCER_RESUMED(producerId, userId));
    }
  }

  /**
   * Producer를 일시 중지
   */
  async pauseProducer(producerId: string, userId: string): Promise<{ success: boolean }> {
    await this._setProducerPausedState(producerId, userId, true);
    return { success: true };
  }

  /**
   * Producer를 재개
   */
  async resumeProducer(producerId: string, userId: string): Promise<{ success: boolean }> {
    await this._setProducerPausedState(producerId, userId, false);
    return { success: true };
  }

  /**
   * Producer를 종료
   */
  async closeProducer(producerId: string, userId: string): Promise<{ success: boolean }> {
    const producer = await this._getAndValidateProducer(producerId, userId);
    producer.close();
    logMessage(this.logger, LOG.VOICE.PRODUCER_CLOSED(producerId, userId));
    return { success: true };
  }

  /**
   * 클라이언트의 WebRTC Transport를 종료하고 관련 리소스 정리
   * Transport 객체 닫힘 이벤트에 로컬 맵 메타데이터 정리 로직 연결
   */
  async closeTransport(dto: VoiceTransportCloseDto) {
    const transport = await this._getAndValidateTransport(dto.transport_id, dto.room_id);
    transport.close();
    logMessage(this.logger, LOG.VOICE.TRANSPORT_CLOSED(transport.id));
    return { success: true };
  }

  /**
   * 특정 방의 Router를 닫고 관련 리소스를 정리
   * Router 객체 닫힘 이벤트에 로컬 맵 정리 로직 연결
   */
  async closeRouter(roomId: string) {
    const router = this.routers.get(roomId);
    if (router) {
      router.close();
      logMessage(this.logger, LOG.VOICE.ROUTER_CLOSED(router.id, roomId));
    }
  }
}
