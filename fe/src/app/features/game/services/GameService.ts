import { WebSocketService } from '@/app/services/websocket.service';
import { WS_EVENTS } from '@/app/services/events';
import { GameConverter } from '@/app/features/game/dtos/converter';
import {
  GameJoinAckData,
  GameJoinData,
  GamePlayerJoinData,
  GamePlayerLeaveData,
  GameRecruitAckData,
  GameRecruitData,
  GamePlayerRecruitData,
  GameLeaveData,
} from '@/app/features/game/dtos/data';
import {
  GameJoinAckDto,
  GameJoinDto,
  GamePlayerJoinDto,
  GamePlayerLeaveDto,
  GameRecruitAckDto,
  GameRecruitDto,
  GamePlayerRecruitDto,
  GameLeaveDto,
} from '@/app/features/game/dtos/dto';

type PlayerJoinCallback = (data: GamePlayerJoinData) => void;
type PlayerLeaveCallback = (data: GamePlayerLeaveData) => void;
type RecruitCallback = (data: GamePlayerRecruitData) => void;

/**
 * 게임 관련 WebSocket 요청/리스너 서비스
 * - DTO ↔ Data 변환을 일관되게 사용
 */
class GameService {
  private playerJoinCallbacks: Set<PlayerJoinCallback> = new Set();
  private playerLeaveCallbacks: Set<PlayerLeaveCallback> = new Set();
  private recruitCallbacks: Set<RecruitCallback> = new Set();
  private eventHandlers: Map<string, (...args: any[]) => void> = new Map();
  private handlersRegistered = false;

  /**
   * 게임 모집 시작 (방장만)
   */
  async recruit(roomId: string): Promise<GameRecruitAckData> {
    await WebSocketService.ensureConnected();

    const data: GameRecruitData = { roomId };
    const dto: GameRecruitDto = GameConverter.toGameRecruitDto(data);
    const ackDto = (await WebSocketService.request(
      WS_EVENTS.GAME_RECRUIT,
      dto,
    )) as GameRecruitAckDto;
    return GameConverter.toGameRecruitData(ackDto);
  }

  /**
   * 게임 나가기 (브로드캐스트만 수신)
   */
  async leave(roomId: string): Promise<void> {
    await WebSocketService.ensureConnected();
    const data: GameLeaveData = { roomId };
    const dto: GameLeaveDto = GameConverter.toGameLeaveDto(data);
    WebSocketService.send(WS_EVENTS.GAME_LEAVE, dto);
  }

  /**
   * 게임 모집 브로드캐스트 구독
   */
  onRecruit(callback: RecruitCallback): () => void {
    this.recruitCallbacks.add(callback);
    this.registerEventHandlers();
    return () => this.recruitCallbacks.delete(callback);
  }

  onPlayerLeave(callback: PlayerLeaveCallback): () => void {
    this.playerLeaveCallbacks.add(callback);
    this.registerEventHandlers();
    return () => this.playerLeaveCallbacks.delete(callback);
  }

  private registerEventHandlers(): void {
    if (this.handlersRegistered) return;
    this.handlersRegistered = true;

    const playerJoinHandler = (dto: GamePlayerJoinDto) => {
      const data = GameConverter.toGamePlayerJoinData(dto);
      this.playerJoinCallbacks.forEach((cb) => cb(data));
    };

    const playerLeaveHandler = (dto: GamePlayerLeaveDto) => {
      const data = GameConverter.toGamePlayerLeaveData(dto);
      this.playerLeaveCallbacks.forEach((cb) => cb(data));
    };

    const recruitHandler = (dto: GamePlayerRecruitDto) => {
      const data = GameConverter.toGamePlayerRecruitData(dto);
      this.recruitCallbacks.forEach((cb) => cb(data));
    };

    this.eventHandlers.set(WS_EVENTS.GAME_PLAYER_JOIN, playerJoinHandler);
    WebSocketService.on(WS_EVENTS.GAME_PLAYER_JOIN, playerJoinHandler);

    this.eventHandlers.set(WS_EVENTS.GAME_PLAYER_LEAVE, playerLeaveHandler);
    WebSocketService.on(WS_EVENTS.GAME_PLAYER_LEAVE, playerLeaveHandler);

    this.eventHandlers.set(WS_EVENTS.GAME_PLAYER_RECRUIT, recruitHandler);
    WebSocketService.on(WS_EVENTS.GAME_PLAYER_RECRUIT, recruitHandler);
  }

  /**
   * 게임 참가 (ACK 반환)
   */
  async join(roomId: string): Promise<GameJoinAckData> {
    await WebSocketService.ensureConnected();

    const data: GameJoinData = { roomId };
    const dto: GameJoinDto = GameConverter.toGameJoinDto(data);
    const ackDto = (await WebSocketService.request(WS_EVENTS.GAME_JOIN, dto)) as GameJoinAckDto;
    const ackData = GameConverter.toGameJoinAckData(ackDto);

    return ackData;
  }

  /**
   * 플레이어 참가 브로드캐스트 구독
   */
  onPlayerJoin(callback: PlayerJoinCallback): () => void {
    this.playerJoinCallbacks.add(callback);
    this.registerEventHandlers();
    return () => this.playerJoinCallbacks.delete(callback);
  }
}

export const gameService = new GameService();
