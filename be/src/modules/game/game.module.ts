import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GameService } from './game.service';
import { GameGateway } from './game.gateway';
import { GameController } from './game.controller';
import { RoomModule } from '@src/modules/room/room.module';
import { Game } from './game.entity';
import { GameRecord } from '../game-record/game-record.entity';
import { GameRedisService } from './game-redis.service';
import { GameBroadcastService } from './game-broadcast.service';
import { GameTimerService } from './game-timer.service';

@Module({
  imports: [forwardRef(() => RoomModule), TypeOrmModule.forFeature([Game, GameRecord])],
  controllers: [GameController],
  providers: [GameService, GameGateway, GameRedisService, GameBroadcastService, GameTimerService],
  exports: [GameService],
})
export class GameModule {}
