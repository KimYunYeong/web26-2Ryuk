import { IsString } from 'class-validator';

export class GetRouterRtpCapabilitiesDto {
  @IsString()
  room_Id: string;
}
