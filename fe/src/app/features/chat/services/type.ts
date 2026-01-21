export interface ChatChannel {
  sendMessage(message: string): void;
  subscribe(): void;
  unsubscribe(): void;
}

import { ChatReceiveDto } from '@/app/features/chat/dtos/dto';
import { ChatReceiveData } from '@/app/features/chat/dtos/data';

// WebSocket 콜백 타입
export type MessageCallback = (message: ChatReceiveData) => void;
export type ConnectionCallback = (isConnected: boolean) => void;
export type ParticipantsCallback = (count: number) => void;
export type RecentsCallback = (messages: ChatReceiveData[]) => void;

// WebSocket 에러 DTO
export interface WebSocketErrorDto {
  message: string;
}

// 방 입장/퇴장 관련 DTO
export interface RoomJoinedAckDto {
  roomId: string;
  current_participants?: number;
}

export interface RoomJoinedBroadcastDto {
  roomId: string;
  user: {
    id: string;
    nickname: string;
    profile_image?: string;
  };
  current_participants: string;
}

export interface RoomLeftAckDto {
  roomId: string;
}

export interface RoomLeftBroadcastDto {
  roomId: string;
  userId: string;
  current_participants: string;
}

// 글로벌 채팅 참여자 업데이트 DTO
export interface ParticipantsUpdatedDto {
  roomId: string;
  current_participants: number;
}

// 글로벌 채팅 최신 메시지 목록 DTO
export interface GlobalChatRecentsDto {
  messages: ChatReceiveDto[];
  current_participants?: number;
}
