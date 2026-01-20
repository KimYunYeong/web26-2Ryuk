import { Injectable, OnModuleInit, Logger, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as mediasoup from 'mediasoup';
import { Worker, Router, RtpCodecCapability } from 'mediasoup/node/lib/types';
import { LOG, logMessage } from '@src/common/utils/log-messages';

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
  private worker: Worker; // mediasoup Worker 인스턴스
  private routers: Map<string, Router> = new Map(); // 생성된 Router 관리 맵 (roomId -> Router)
  private readonly logger = new Logger(VoiceService.name);

  constructor(private readonly configService: ConfigService) {}

  /**
   * 모듈 초기화 시 mediasoup Worker를 생성
   */
  async onModuleInit() {
    logMessage(this.logger, LOG.VOICE.CREATING_WORKER);
    const rtcMinPort = this.configService.get<number>('MEDIASOUP_RTC_MIN_PORT');
    const rtcMaxPort = this.configService.get<number>('MEDIASOUP_RTC_MAX_PORT');

    if (!rtcMinPort || !rtcMaxPort) {
      throw new InternalServerErrorException('Mediasoup rtc port environment variables are not configured.');
    }

    this.worker = await mediasoup.createWorker({
      rtcMinPort: +rtcMinPort,
      rtcMaxPort: +rtcMaxPort,
      logLevel: 'debug',
      logTags: ['rtp', 'rtcp', 'rtx', 'bwe', 'score', 'simulcast', 'svc'],
    });

    // Worker가 예기치 않게 종료되었을 때 처리
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

    // 이 Router에서 사용할 미디어 코덱 설정
    const router = await this.worker.createRouter({ mediaCodecs });
    this.routers.set(roomId, router);
    logMessage(this.logger, LOG.VOICE.ROUTER_CREATED(router.id, roomId));
    return router;
  }

  /**
   * 특정 방의 Router의 RTP Capabilities를 조회
   * RTP Capabilities는 해당 Router가 어떤 코덱과 RTP 파라미터를 지원하는지에 대한 정보
   */
  async getRouterRtpCapabilities(roomId: string) {
    const router = await this.getOrCreateRouter(roomId);
    return router.rtpCapabilities;
  }

  /**
   * 특정 방의 Router를 닫고 맵에서 삭제
   * 방이 비거나 삭제될 때 호출
   */
  closeRouter(roomId: string) {
    const router = this.routers.get(roomId);
    if (!router) {
      return;
    }
    router.close();
    this.routers.delete(roomId);
    logMessage(this.logger, LOG.VOICE.ROUTER_CLOSED(router.id, roomId));
  }
}
