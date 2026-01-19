import { IsString, IsNotEmpty, IsUUID } from 'class-validator';

export class GameRecruitDto {
  @IsString()
  @IsNotEmpty()
  @IsUUID()
  room_id: string;
}
