import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GameService } from './game.service';
import { GameGateway } from './game.gateway';
import { RoomModule } from '@src/modules/room/room.module';
import { Game } from './game.entity';

@Module({
  imports: [RoomModule, TypeOrmModule.forFeature([Game])],
  providers: [GameService, GameGateway],
  exports: [GameService],
})
export class GameModule {}
