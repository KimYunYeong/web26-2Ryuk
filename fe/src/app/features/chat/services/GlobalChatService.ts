'use client';

import { ChatReceiveDto, ChatReceiveData } from '@/app/features/chat/dtos/type';
import { ChatConverter } from '@/app/features/chat/dtos/Chat';
import {
  ChatChannel,
  MessageCallback,
  ConnectionCallback,
  ParticipantsCallback,
  WebSocketErrorDto,
  ParticipantsUpdatedDto,
  GlobalChatRecentsDto,
} from './type';
import { WS_EVENTS } from '@/app/services/events';
import { WebSocketService } from '@/app/services/websocket.service';
import { authStore } from '@/app/features/user/stores/auth';
import { roomStore } from '@/app/features/room/stores/room';

/**
 * GlobalChat 클라이언트 서비스
 */
export class GlobalChatService implements ChatChannel {
  private messageCallbacks: Set<MessageCallback> = new Set();
  private connectionCallbacks: Set<ConnectionCallback> = new Set();
  private participantsCallbacks: Set<ParticipantsCallback> = new Set();
  private isSubscribed = false;
  private messages: ChatReceiveData[] = [];
  private eventHandlers: Map<string, (...args: any[]) => void> = new Map();
  private connectPromise: Promise<void> | null = null;

  async connect(): Promise<void> {
    if (WebSocketService.isConnected()) {
      this.registerEventHandlers();
      this.notifyConnection(true);
      return;
    }

    if (this.connectPromise) return this.connectPromise;

    const wsUrl =
      process.env.NEXT_PUBLIC_WS_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

    this.registerEventHandlers();
    WebSocketService.connect(wsUrl);

    this.connectPromise = WebSocketService.ensureConnected();
    await this.connectPromise;
    this.connectPromise = null;
  }

  async ensureConnected(): Promise<void> {
    if (WebSocketService.isConnected()) return;
    await this.connect();
  }

  async joinRoom(roomId: string): Promise<void> {
    await this.ensureConnected();

    const currentState = roomStore.getState();
    const alreadyJoined = currentState.isJoined && currentState.roomId === roomId;

    WebSocketService.send(WS_EVENTS.ROOM_JOIN, { room_id: roomId });
    if (!alreadyJoined) roomStore.getState().setRoom(roomId);
  }

  async subscribe(): Promise<void> {
    if (this.isSubscribed) this.unsubscribe();

    await this.connect();
    if (WebSocketService.isConnected()) this.notifyConnection(true);

    WebSocketService.send(WS_EVENTS.CHAT_GLOBAL_JOIN, {});
    this.isSubscribed = true;
  }

  private registerEventHandlers(): void {
    this.removeEventHandlers();

    const connectHandler = () => this.notifyConnection(true);
    this.eventHandlers.set(WS_EVENTS.CONNECT, connectHandler);
    WebSocketService.on(WS_EVENTS.CONNECT, connectHandler);

    const disconnectHandler = () => this.notifyConnection(false);
    this.eventHandlers.set(WS_EVENTS.DISCONNECT, disconnectHandler);
    WebSocketService.on(WS_EVENTS.DISCONNECT, disconnectHandler);

    const messageHandler = (dto: ChatReceiveDto) => this.handleGlobalMessage(dto);
    this.eventHandlers.set(WS_EVENTS.CHAT_GLOBAL_NEW_MESSAGE, messageHandler);
    WebSocketService.on(WS_EVENTS.CHAT_GLOBAL_NEW_MESSAGE, messageHandler);

    const participantsHandler = (dto: ParticipantsUpdatedDto) =>
      this.notifyParticipants(dto.current_participants);
    this.eventHandlers.set(WS_EVENTS.CHAT_GLOBAL_PARTICIPANTS_UPDATED, participantsHandler);
    WebSocketService.on(WS_EVENTS.CHAT_GLOBAL_PARTICIPANTS_UPDATED, participantsHandler);

    const recentsHandler = (dto: GlobalChatRecentsDto) => this.handleGlobalChatRecents(dto);
    this.eventHandlers.set(WS_EVENTS.CHAT_GLOBAL_RECENTS, recentsHandler);
    WebSocketService.on(WS_EVENTS.CHAT_GLOBAL_RECENTS, recentsHandler);

    const errorHandler = (error: WebSocketErrorDto) =>
      console.error('[GlobalChatService] WebSocket error:', error);
    this.eventHandlers.set(WS_EVENTS.ERROR, errorHandler);
    WebSocketService.on(WS_EVENTS.ERROR, errorHandler);
  }

  private removeEventHandlers(): void {
    this.eventHandlers.forEach((handler, event) => WebSocketService.off(event, handler));
    this.eventHandlers.clear();
  }

  private handleGlobalMessage(dto: ChatReceiveDto): void {
    const chatData = ChatConverter.toReceiveData(dto);
    this.messages.push(chatData);
    this.notifyMessage(chatData);
  }

  private handleGlobalChatRecents(dto: GlobalChatRecentsDto): void {
    this.messages = [];

    dto.messages.forEach((msg) => {
      const chatData = ChatConverter.toReceiveData(msg);
      this.messages.push(chatData);
      this.notifyMessage(chatData);
    });

    if (dto.current_participants != null) this.notifyParticipants(dto.current_participants);
  }

  unsubscribe(): void {
    if (!this.isSubscribed) return;

    this.notifyConnection(false);
    this.removeEventHandlers();
    WebSocketService.disconnect();
    this.connectPromise = null;
    this.isSubscribed = false;
  }

  sendMessage(message: string): void {
    if (!authStore.getState().isAuthenticated)
      throw new Error('메시지를 보내려면 로그인이 필요합니다.');
    if (!WebSocketService.isConnected()) throw new Error('WebSocket이 연결되지 않았습니다.');

    const dto = ChatConverter.toSendDto({ message });
    WebSocketService.send(WS_EVENTS.CHAT_GLOBAL_SEND, dto);
  }

  notifyLogout(): void {
    if (!WebSocketService.isConnected()) return;
    WebSocketService.send(WS_EVENTS.AUTH_LOGOUT, {});
  }

  onMessage(callback: MessageCallback): () => void {
    this.messageCallbacks.add(callback);
    return () => this.messageCallbacks.delete(callback);
  }

  onConnectionChange(callback: ConnectionCallback): () => void {
    this.connectionCallbacks.add(callback);
    return () => this.connectionCallbacks.delete(callback);
  }

  onParticipantsChange(callback: ParticipantsCallback): () => void {
    this.participantsCallbacks.add(callback);
    return () => this.participantsCallbacks.delete(callback);
  }

  isConnected(): boolean {
    return WebSocketService.isConnected();
  }

  getMessages(): ChatReceiveData[] {
    return [...this.messages];
  }

  private notifyMessage(message: ChatReceiveData): void {
    this.messageCallbacks.forEach((callback) => callback(message));
  }

  private notifyConnection(isConnected: boolean): void {
    this.connectionCallbacks.forEach((callback) => callback(isConnected));
  }

  private notifyParticipants(count: number): void {
    this.participantsCallbacks.forEach((callback) => callback(count));
  }
}

export const globalChatService = new GlobalChatService();
