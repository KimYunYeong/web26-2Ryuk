import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GameRecordService } from './game-record.service';
import { GameRecordController } from './game-record.controller';
import { Game } from '@src/modules/game/game.entity';
import { GameRecord } from '@src/modules/game-record/game-record.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Game, GameRecord])],
  controllers: [GameRecordController],
  providers: [GameRecordService],
  exports: [GameRecordService],
})
export class GameRecordModule {}
