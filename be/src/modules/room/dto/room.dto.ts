import { IsString, IsNotEmpty } from 'class-validator';

export class RoomJoinDto {
  @IsString()
  @IsNotEmpty()
  roomId: string;
}

export class RoomLeaveDto {
  @IsString()
  @IsNotEmpty()
  roomId: string;
}

// 방 목록의 각각의 항목 dto
export interface RoomListItemDto {
  id: string;
  title: string;
  tags: string[];
  current_participants: number;
  max_participants: number;
  is_mic_available: boolean;
  is_private: boolean;
  participant_profile_images: string[];
  create_date: string;
}

// 방 목록 응답 시 사용하는 dto
export interface RoomListResponseDto {
  rooms: RoomListItemDto[];
}
