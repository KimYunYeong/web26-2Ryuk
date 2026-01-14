import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { RoomController } from './room.controller';
import { RoomService } from './room.service';
import { RoomGateway } from './room.gateway';

@Module({
  imports: [AuthModule],
  controllers: [RoomController],
  providers: [RoomService, RoomGateway],
  exports: [RoomService],
})
export class RoomModule {}
