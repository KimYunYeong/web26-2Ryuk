import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

/**
 * REST API 방 입장 요청 DTO (Body)
 * URL 파라미터로 roomId를 받음
 */
export class JoinRoomRequestDto {
  @IsString()
  @IsOptional()
  password?: string;
}

/**
 * WebSocket 방 입장 요청 DTO
 */
export class RoomJoinDto extends JoinRoomRequestDto {
  @IsString()
  @IsNotEmpty()
  roomId: string;
}

export class RoomLeaveDto {
  @IsString()
  @IsNotEmpty()
  roomId: string;
}
