import { Module, forwardRef } from '@nestjs/common';
import { VoiceService } from './voice.service';
import { VoiceGateway } from './voice.gateway';
import { AuthModule } from '../auth/auth.module';
import { RoomModule } from '../room/room.module';

@Module({
  imports: [AuthModule, forwardRef(() => RoomModule)],
  providers: [VoiceService, VoiceGateway],
  exports: [VoiceService],
})
export class VoiceModule {}
