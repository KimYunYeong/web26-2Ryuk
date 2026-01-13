import { IsBoolean, IsString } from 'class-validator';

export class HttpResponseDto<T> {
  @IsBoolean()
  success: boolean;

  @IsString()
  message: string;

  data?: T;

  constructor(success: boolean, message: string, data?: T) {
    this.success = success;
    this.message = message;
    this.data = data;
  }
}
