export interface ChatChannel {
  sendMessage(message: string): Promise<void>;
  subscribe(): Promise<void>;
  unsubscribe(): Promise<void>;
}

import { ChatReceiveData } from '@/app/features/chat/dtos/data';
import {
  RoomParticipantJoinData,
  RoomParticipantLeaveData,
  RoomParticipantDeleteData,
  RoomBanData,
} from '@/app/features/room/dtos/data';

// WebSocket 콜백 타입
export type MessageCallback = (message: ChatReceiveData) => void;
export type ConnectionCallback = (isConnected: boolean) => void;
export type ParticipantsCallback = (count: number) => void;
export type RecentsCallback = (messages: ChatReceiveData[]) => void;

export type JoinCallback = (data: RoomParticipantJoinData) => void;
export type LeaveCallback = (data: RoomParticipantLeaveData) => void;
export type DeleteCallback = (data: RoomParticipantDeleteData) => void;
export type BanCallback = (data: RoomBanData) => void;

// WebSocket 에러 DTO
export interface WebSocketErrorDto {
  message: string;
}
