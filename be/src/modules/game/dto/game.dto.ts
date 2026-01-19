import { IsString, IsNotEmpty, IsUUID } from 'class-validator';

export class GameRecruitDto {
  @IsString()
  @IsNotEmpty()
  @IsUUID()
  room_id: string;
}

export class GameJoinDto {
  @IsString()
  @IsNotEmpty()
  @IsUUID()
  room_id: string;
}

export interface GameInfoDto {
  id: string;
  title: string;
  type: string;
  description: string;
  min_participants: number;
  max_participants: number;
}

export class GameListResponseDto {
  games: GameInfoDto[];
}
