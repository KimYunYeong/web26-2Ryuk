import { IsString, IsBoolean, IsObject, IsIn } from 'class-validator';
import { DtlsParameters, RtpParameters } from 'mediasoup/node/lib/types';

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

export class CreateProducerDto {
  @IsString()
  room_id: string;

  @IsString()
  transport_id: string;

  @IsIn(['audio', 'video'])
  kind: 'audio' | 'video';

  @IsObject()
  rtp_parameters: RtpParameters;
}

export class ProducerStateChangeDto {
  @IsString()
  room_id: string;

  @IsString()
  producer_id: string;
}
