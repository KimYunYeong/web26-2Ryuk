'use client';

import * as chatConverter from '@/app/features/chat/dtos/converter';
import * as chatData from '@/app/features/chat/dtos/data';
import * as chatDto from '@/app/features/chat/dtos/dto';
import * as wsEvents from '@/app/services/events';
import { WebSocketService } from '@/app/services/websocket.service';
import { authStore } from '@/app/features/user/stores/auth';
import * as callback from './type';
import { chatPanelStore } from '@/app/features/chat/stores/chatPanel';

export class GlobalChatService implements callback.ChatChannel {
  private readonly GLOBAL_ROOM_ID = 'global-room-001';

  private messageCallbacks: Set<callback.MessageCallback> = new Set();
  private connectionCallbacks: Set<callback.ConnectionCallback> = new Set();
  private participantsCallbacks: Set<callback.ParticipantsCallback> = new Set();
  private recentsCallbacks: Set<callback.RecentsCallback> = new Set();
  private unreadCallbacks: Set<(isUnread: boolean) => void> = new Set();

  private isSubscribed = false;
  private messages: chatData.ChatReceiveData[] = [];
  private currentParticipants = 0;
  private isUnread = false;

  private eventHandlers: Map<string, (...args: any[]) => void> = new Map();
  private handlersRegistered = false;
  private boundSocket?: unknown;
  private connectPromise?: Promise<void>;

  constructor() {
    WebSocketService.onReconnect(() => {
      if (!this.isSubscribed) return;
      this.removeEventHandlers();
      this.registerEventHandlers();
    });
  }

  async connect(): Promise<void> {
    if (WebSocketService.isConnected()) {
      this.ensureHandlersRegistered();
      this.notifyConnection(true);
      return;
    }

    if (this.connectPromise) return this.connectPromise;

    const wsUrl = process.env.NEXT_PUBLIC_API_URL;
    if (!wsUrl) throw Error('환경변수가 없습니다: NEXT_PUBLIC_API_URL');

    this.ensureHandlersRegistered();
    WebSocketService.connect(wsUrl);

    this.connectPromise = WebSocketService.ensureConnected();
    await this.connectPromise;
    this.connectPromise = undefined;

    this.ensureHandlersRegistered();
  }

  async ensureConnected(): Promise<void> {
    if (WebSocketService.isConnected()) return;
    await this.connect();
  }

  async subscribe(): Promise<void> {
    if (this.isSubscribed) return;

    await this.connect();
    if (!WebSocketService.isConnected()) return;

    const joinDto = chatConverter.toGlobalJoinDto({
      roomId: this.GLOBAL_ROOM_ID,
    });

    const joinAckDto = (await WebSocketService.request(
      wsEvents.WS_EVENTS.CHAT_GLOBAL_JOIN,
      joinDto,
    )) as chatDto.ChatGlobalJoinAckDto;

    const joinData = chatConverter.toGlobalJoinAckData(joinAckDto);

    this.messages = joinData.messages;
    this.currentParticipants = joinData.currentParticipants ?? 0;

    this.notifyRecents(this.messages);
    this.notifyParticipants(this.currentParticipants);

    this.isSubscribed = true;
  }

  async unsubscribe(): Promise<void> {
    if (!this.isSubscribed) return;

    this.notifyConnection(false);
    this.removeEventHandlers();
    WebSocketService.disconnect();

    this.connectPromise = undefined;
    this.boundSocket = undefined;
    this.isSubscribed = false;
  }

  async sendMessage(message: string): Promise<void> {
    if (!authStore.getState().isAuthenticated)
      throw new Error('메시지를 보내려면 로그인이 필요합니다.');
    if (!WebSocketService.isConnected()) throw new Error('WebSocket이 연결되지 않았습니다.');

    const sendDto = chatConverter.toGlobalSendDto({ message } as chatData.ChatGlobalSendData);

    const ackDto = (await WebSocketService.request(
      wsEvents.WS_EVENTS.CHAT_GLOBAL_SEND,
      sendDto,
    )) as chatDto.ChatGlobalSendAckDto;

    const ackData = chatConverter.toGlobalSendAckData(ackDto);

    this.messages = [...this.messages, ackData];
    this.notifyMessage(ackData);
  }

  notifyLogout(): void {
    if (!WebSocketService.isConnected()) return;
    WebSocketService.send(wsEvents.WS_EVENTS.AUTH_LOGOUT, {});
  }

  incrementParticipantsOptimistic(): void {
    this.currentParticipants += 1;
    this.notifyParticipants(this.currentParticipants);
  }

  decrementParticipantsOptimistic(): void {
    if (this.currentParticipants <= 0) return;
    this.currentParticipants -= 1;
    this.notifyParticipants(this.currentParticipants);
  }

  onMessage(cb: callback.MessageCallback): () => void {
    this.messageCallbacks.add(cb);
    return () => this.messageCallbacks.delete(cb);
  }

  onConnectionChange(cb: callback.ConnectionCallback): () => void {
    this.connectionCallbacks.add(cb);
    return () => this.connectionCallbacks.delete(cb);
  }

  onParticipantsChange(cb: callback.ParticipantsCallback): () => void {
    this.participantsCallbacks.add(cb);
    cb(this.currentParticipants);
    return () => this.participantsCallbacks.delete(cb);
  }

  onRecents(cb: callback.RecentsCallback): () => void {
    this.recentsCallbacks.add(cb);
    return () => this.recentsCallbacks.delete(cb);
  }

  getIsUnread(): boolean {
    return this.isUnread;
  }

  markAsRead(): void {
    if (!this.isUnread) return;
    this.isUnread = false;
    this.notifyUnreadChange(false);
  }

  onUnreadChange(cb: (isUnread: boolean) => void): () => void {
    this.unreadCallbacks.add(cb);
    cb(this.isUnread);
    return () => this.unreadCallbacks.delete(cb);
  }

  isConnected(): boolean {
    return WebSocketService.isConnected();
  }

  getMessages(): chatData.ChatReceiveData[] {
    return [...this.messages];
  }

  private ensureHandlersRegistered(): void {
    const socket = WebSocketService.getSocket();
    if (!socket) return;

    if (this.boundSocket !== socket) {
      this.removeEventHandlers();
      this.boundSocket = socket;
    }

    this.registerEventHandlers();
  }

  private registerEventHandlers(): void {
    if (this.handlersRegistered) return;
    this.handlersRegistered = true;

    // connect
    const onConnect = () => this.notifyConnection(true);
    this.eventHandlers.set(wsEvents.WS_EVENTS.CONNECT, onConnect);
    WebSocketService.on(wsEvents.WS_EVENTS.CONNECT, onConnect);

    // disconnect
    const onDisconnect = () => this.notifyConnection(false);
    this.eventHandlers.set(wsEvents.WS_EVENTS.DISCONNECT, onDisconnect);
    WebSocketService.on(wsEvents.WS_EVENTS.DISCONNECT, onDisconnect);

    // chat:global:new-message
    const onMessage = (dto: chatDto.ChatGlobalNewMessageDto) => this.handleGlobalMessage(dto);
    this.eventHandlers.set(wsEvents.WS_EVENTS.CHAT_GLOBAL_NEW_MESSAGE, onMessage);
    WebSocketService.on(wsEvents.WS_EVENTS.CHAT_GLOBAL_NEW_MESSAGE, onMessage);

    // chat:global:participants-updated
    const onParticipants = (dto: chatDto.ChatGlobalParticipantsUpdatedDto) => {
      const data = chatConverter.toGlobalParticipantsUpdatedData(dto);
      this.currentParticipants = data.currentParticipants;
      this.notifyParticipants(this.currentParticipants);
    };
    this.eventHandlers.set(wsEvents.WS_EVENTS.CHAT_GLOBAL_PARTICIPANTS_UPDATED, onParticipants);
    WebSocketService.on(wsEvents.WS_EVENTS.CHAT_GLOBAL_PARTICIPANTS_UPDATED, onParticipants);

    // chat:global:recents
    const onRecents = (dto: chatDto.GlobalChatRecentsDto) => this.handleGlobalChatRecents(dto);
    this.eventHandlers.set(wsEvents.WS_EVENTS.CHAT_GLOBAL_RECENTS, onRecents);
    WebSocketService.on(wsEvents.WS_EVENTS.CHAT_GLOBAL_RECENTS, onRecents);

    // error
    const onError = (error: any) => this.handleError(error);
    this.eventHandlers.set(wsEvents.WS_EVENTS.ERROR, onError);
    WebSocketService.on(wsEvents.WS_EVENTS.ERROR, onError);
  }

  private removeEventHandlers(): void {
    this.eventHandlers.forEach((handler, event) => {
      WebSocketService.off(event, handler);
    });
    this.eventHandlers.clear();
    this.handlersRegistered = false;
  }

  private handleGlobalMessage(dto: chatDto.ChatGlobalNewMessageDto): void {
    const chatData = chatConverter.toGlobalNewMessageData(dto);
    this.messages = [...this.messages, chatData];
    this.notifyMessage(chatData);

    // 닫힌 상태에서만 안읽음 표시
    const isExpanded = chatPanelStore.getState().global.isExpanded;
    if (!isExpanded) this.setUnread();
  }

  private handleGlobalChatRecents(dto: chatDto.GlobalChatRecentsDto): void {
    const chatMessages = dto.messages.map(chatConverter.toReceiveData);
    this.messages = [...chatMessages];

    this.notifyRecents(chatMessages);
    if (dto.current_participants != null) {
      this.currentParticipants = dto.current_participants;
      this.notifyParticipants(this.currentParticipants);
    }
  }

  private handleError(error: any): void {
    console.error('[GlobalChatService] WebSocket error:', error);
  }

  private notifyMessage(message: chatData.ChatReceiveData): void {
    this.messageCallbacks.forEach((cb) => cb(message));
  }

  private notifyConnection(isConnected: boolean): void {
    this.connectionCallbacks.forEach((cb) => cb(isConnected));
  }

  private notifyParticipants(count: number): void {
    this.participantsCallbacks.forEach((cb) => cb(count));
  }

  private notifyRecents(messages: chatData.ChatReceiveData[]): void {
    this.recentsCallbacks.forEach((cb) => cb(messages));
  }

  private notifyUnreadChange(isUnread: boolean): void {
    this.unreadCallbacks.forEach((cb) => cb(isUnread));
  }

  private setUnread(): void {
    if (this.isUnread) return;
    this.isUnread = true;
    this.notifyUnreadChange(true);
  }
}

export const globalChatService = new GlobalChatService();
