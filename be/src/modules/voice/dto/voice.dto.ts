import { IsString, IsBoolean, IsObject } from 'class-validator';
import { DtlsParameters } from 'mediasoup/node/lib/types';

export class GetRouterRtpCapabilitiesDto {
  @IsString()
  room_Id: string;
}

export class VoiceTransportCreateDto {
  @IsString()
  room_id: string;

  @IsBoolean()
  producing: boolean;
}

export class VoiceTransportConnectDto {
  @IsString()
  room_id: string;

  @IsString()
  transport_id: string;

  @IsObject()
  dtls_parameters: DtlsParameters;
}

export class VoiceTransportCloseDto {
  @IsString()
  room_id: string;

  @IsString()
  transport_id: string;
}
