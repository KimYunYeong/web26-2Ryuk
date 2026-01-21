import { ChatReceiveDto } from '@/app/features/chat/dtos/dto';
import { ChatReceiveData } from '@/app/features/chat/dtos/data';
import { WebSocketService } from '@/app/services/websocket.service';
import { ChatConverter } from '@/app/features/chat/dtos/converter';
import { roomStore } from '@/app/features/room/stores/room';
import { globalChatService } from './GlobalChatService';
import {
  RoomJoinedAckDto,
  RoomJoinedBroadcastDto,
  RoomLeftAckDto,
  RoomLeftBroadcastDto,
  MessageCallback,
  ConnectionCallback,
} from './type';
import { WS_EVENTS } from '@/app/services/events';
import { toastStore } from '@/app/components/shared/toast/toast.store';
import { authStore } from '@/app/features/user/stores/auth';

/**
 * RoomChat 클라이언트 서비스
 * 클라이언트에서 이미 연결된 WebSocket 세션을 사용하여 방 채팅 메시지 관리 담당
 */
export class RoomChatService {
  private messageCallbacks: Set<MessageCallback> = new Set();
  private connectionCallbacks: Set<ConnectionCallback> = new Set();
  private roomInvalidatedCallbacks: Set<() => void> = new Set();
  private isSubscribed = false;
  private messages: ChatReceiveData[] = [];
  private currentRoomId: string | null = null;
  private eventHandlers: Map<string, (...args: any[]) => void> = new Map();

  /**
   * 방 채팅 구독 (이미 연결된 WebSocket 세션 사용)
   * @param roomId 방 ID
   */
  async subscribe(roomId: string): Promise<void> {
    const isMyRoom = this.currentRoomId === roomId;
    const isConnected = WebSocketService.isConnected();

    // 다른 대화방 소속 중
    if (this.isSubscribed && !isMyRoom) this.unsubscribe();

    // 동일 대화방 소속 중
    if (this.isSubscribed && isMyRoom && isConnected) return this.registerEventHandlers();

    try {
      // GlobalChatService를 통해 연결 보장
      await globalChatService.ensureConnected();

      // WebSocket 연결 확인
      const socket = WebSocketService.getSocket();
      if (!socket) return;

      if (!socket.connected) {
        await new Promise<void>((resolve) => socket.once(WS_EVENTS.CONNECT, resolve));
      }

      this.currentRoomId = roomId;
      this.registerEventHandlers();

      // 방 입장 요청 (ACK 필요 이벤트이므로 request 사용)
      const ack = (await WebSocketService.request(WS_EVENTS.ROOM_JOIN, {
        room_id: roomId,
      })) as RoomJoinedAckDto;

      roomStore.getState().setRoom(roomId);
      roomStore.getState().setJoined(true);

      if (ack?.current_participants != null) {
        roomStore.getState().updateRoomData({
          currentParticipants: ack.current_participants,
        });
      }

      this.isSubscribed = true;
      this.notifyConnection(true);
    } catch (e) {
      this.notifyConnection(false);
      throw e;
    }
  }

  /**
   * room:joined 이벤트 핸들러에서 호출
   */
  onRoomJoined(roomId: string): void {
    if (this.currentRoomId !== roomId) return;

    roomStore.getState().setJoined(true);
    this.notifyConnection(true);
  }

  /**
   * WebSocket 이벤트 핸들러 등록
   */
  private registerEventHandlers(): void {
    // 기존 핸들러 제거
    this.removeEventHandlers();

    // 소켓 끊김 시 연결 상태만 false
    const disconnectHandler = () => this.notifyConnection(false);
    this.eventHandlers.set(WS_EVENTS.DISCONNECT, disconnectHandler);
    WebSocketService.on(WS_EVENTS.DISCONNECT, disconnectHandler);

    // 소켓 재연결 시 같은 방이면 room:join 재요청
    const connectHandler = async () => {
      if (this.isSubscribed && this.currentRoomId && WebSocketService.isConnected()) {
        try {
          await WebSocketService.request(WS_EVENTS.ROOM_JOIN, {
            room_id: this.currentRoomId,
          });
        } catch (error) {
          console.error('[RoomChatService] reconnect room:join 실패:', error);
          this.notifyConnection(false);
        }
      }
    };
    this.eventHandlers.set(WS_EVENTS.CONNECT, connectHandler);
    WebSocketService.on(WS_EVENTS.CONNECT, connectHandler);

    // room:joined 브로드캐스트 핸들러
    const joinedBroadcastHandler = (data: RoomJoinedBroadcastDto) => {
      if (data.roomId !== this.currentRoomId) return;

      const currentUserId = authStore.getState().userId;
      const isOtherUser = !currentUserId || data.user.id !== currentUserId;

      if (isOtherUser) {
        toastStore.getState().showInfoToast(`${data.user.nickname}님이 입장했습니다.`);
        roomStore.getState().addParticipant({
          userId: data.user.id,
          nickname: data.user.nickname,
          profileImage: data.user.profile_image || '',
        });
      }

      roomStore.getState().updateRoomData({
        currentParticipants: parseInt(data.current_participants, 10),
      });
    };
    this.eventHandlers.set(WS_EVENTS.ROOM_JOINED, joinedBroadcastHandler);
    WebSocketService.on(WS_EVENTS.ROOM_JOINED, joinedBroadcastHandler);

    // room:leave ACK 핸들러 (방 퇴장 성공)
    const leaveAckHandler = (data: RoomLeftAckDto) => {
      // ACK는 특별한 처리가 필요 없을 수 있음
    };
    this.eventHandlers.set(WS_EVENTS.ROOM_LEAVE, leaveAckHandler);
    WebSocketService.on(WS_EVENTS.ROOM_LEAVE, leaveAckHandler);

    // room:left 브로드캐스트 핸들러 (다른 사용자 퇴장)
    const leftBroadcastHandler = (data: RoomLeftBroadcastDto) => {
      if (data.roomId !== this.currentRoomId) return;

      const currentUserId = authStore.getState().userId;
      const isOtherUser = !currentUserId || data.userId !== currentUserId;

      if (isOtherUser) {
        toastStore.getState().showInfoToast('사용자가 퇴장했습니다.');
        roomStore.getState().removeParticipant(data.userId);
      }

      roomStore.getState().updateRoomData({
        currentParticipants: parseInt(data.current_participants, 10),
      });
    };
    this.eventHandlers.set(WS_EVENTS.ROOM_LEFT, leftBroadcastHandler);
    WebSocketService.on(WS_EVENTS.ROOM_LEFT, leftBroadcastHandler);

    // chat:room:new-message 핸들러
    const messageHandler = (dto: ChatReceiveDto) => this.handleRoomMessage(dto);
    this.eventHandlers.set(WS_EVENTS.CHAT_ROOM_NEW_MESSAGE, messageHandler);
    WebSocketService.on(WS_EVENTS.CHAT_ROOM_NEW_MESSAGE, messageHandler);

    // error 핸들러
    const errorHandler = (error: any) => this.handleError(error);
    this.eventHandlers.set(WS_EVENTS.ERROR, errorHandler);
    WebSocketService.on(WS_EVENTS.ERROR, errorHandler);
  }

  /**
   * 등록된 이벤트 핸들러 제거
   */
  private removeEventHandlers(): void {
    this.eventHandlers.forEach((handler, event) => WebSocketService.off(event, handler));
    this.eventHandlers.clear();
  }

  /**
   * 방 채팅 메시지 수신 이벤트 핸들러
   * Dto를 받아서 Converter를 통해 Data로 변환
   */
  private handleRoomMessage(dto: ChatReceiveDto): void {
    if (!dto.room_id || dto.room_id !== this.currentRoomId) return;
    if (!dto.sender) return;

    const chatData = ChatConverter.toReceiveData(dto);
    this.messages.push(chatData);
    this.notifyMessage(chatData);
  }

  /**
   * WebSocket 에러 이벤트 핸들러
   */
  private handleError(error: any): void {
    console.error('[RoomChatService] WebSocket error:', error);
    roomStore.getState().leaveRoom();
    this.clearSubscriptionOnly();
    this.roomInvalidatedCallbacks.forEach((cb) => cb());
  }

  /**
   * BE 기준 방 소속이 아니게 된 경우, 구독만 정리
   */
  clearSubscriptionOnly(): void {
    this.removeEventHandlers();
    this.isSubscribed = false;
    this.currentRoomId = null;
    this.messages = [];
    this.notifyConnection(false);
  }

  /**
   * BE가 방 소속이 아니라고 했을 때 호출할 콜백 등록
   */
  onRoomInvalidated(callback: () => void): () => void {
    this.roomInvalidatedCallbacks.add(callback);
    return () => this.roomInvalidatedCallbacks.delete(callback);
  }

  /**
   * 방 채팅 구독 해제
   */
  unsubscribe(): void {
    if (!this.isSubscribed) return;

    this.removeEventHandlers();
    roomStore.getState().leaveRoom();

    if (this.currentRoomId && WebSocketService.isConnected()) {
      WebSocketService.send(WS_EVENTS.ROOM_LEAVE, { room_id: this.currentRoomId });
    }

    this.isSubscribed = false;
    this.currentRoomId = null;
    this.messages = [];
    this.notifyConnection(false);
  }

  /**
   * 메시지 전송
   * @param message 전송할 메시지
   */
  sendMessage(message: string): void {
    if (!this.isSubscribed || !this.currentRoomId) return;
    if (!WebSocketService.isConnected()) return;

    WebSocketService.send(WS_EVENTS.CHAT_ROOM_SEND, {
      room_id: this.currentRoomId,
      message,
    });
  }

  /**
   * 저장된 메시지 가져오기
   */
  getMessages(): ChatReceiveData[] {
    return [...this.messages];
  }

  /**
   * 메시지 수신 콜백 등록
   */
  onMessage(callback: MessageCallback): () => void {
    this.messageCallbacks.add(callback);
    return () => this.messageCallbacks.delete(callback);
  }

  /**
   * 연결 상태 변경 콜백 등록
   */
  onConnectionChange(callback: ConnectionCallback): () => void {
    this.connectionCallbacks.add(callback);
    return () => this.connectionCallbacks.delete(callback);
  }

  /**
   * 연결 상태 확인
   */
  isConnected(): boolean {
    return WebSocketService.isConnected();
  }

  /**
   * 메시지 수신 알림
   */
  private notifyMessage(message: ChatReceiveData): void {
    this.messageCallbacks.forEach((callback) => callback(message));
  }

  /**
   * 연결 상태 변경 알림
   */
  private notifyConnection(connected: boolean): void {
    this.connectionCallbacks.forEach((callback) => callback(connected));
  }
}

export const roomChatService = new RoomChatService();
