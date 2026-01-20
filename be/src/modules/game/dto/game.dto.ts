import { IsString, IsNotEmpty, IsUUID } from 'class-validator';

export class GameRoomIdDto {
  @IsString()
  @IsNotEmpty()
  @IsUUID()
  room_id: string;
}

export class GameSelectDto {
  @IsString()
  @IsNotEmpty()
  @IsUUID()
  room_id: string;

  @IsString()
  @IsNotEmpty()
  @IsUUID()
  game_id: string;
}
