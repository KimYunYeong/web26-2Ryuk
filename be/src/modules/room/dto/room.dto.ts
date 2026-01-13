import { IsArray, IsBoolean, IsDate, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

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

export class RoomCreateRequestDto {
  @IsString()
  title: string;

  @IsArray()
  @IsString({ each: true })
  tags: string[];

  @IsNumber()
  max_participants: number;

  @IsBoolean()
  is_mic_available: boolean;

  @IsBoolean()
  is_private: boolean;

  @IsString()
  @IsOptional()
  password?: string;
}

export class RoomResponseDto {
  @IsString()
  id: string;

  @IsString()
  title: string;

  @IsArray()
  @IsString({ each: true })
  tags: string[];

  @IsNumber()
  max_participants: number;

  @IsBoolean()
  is_mic_available: boolean;

  @IsBoolean()
  is_private: boolean;

  @IsDate()
  create_date: Date;
}
