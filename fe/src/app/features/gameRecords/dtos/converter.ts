'use client';

import { GameRecordItemDto, GameRecordListDto } from './dto';
import { GameRecordItemData, GameRecordListData } from './data';

const toGameRecordItemData = (dto: GameRecordItemDto): GameRecordItemData => ({
  playerId: dto.player_id,
  rank: dto.rank,
  nickname: dto.nickname,
  profileImage: dto.profile_image,
  score: dto.score,
  achieveDate: new Date(dto.achieve_date),
});

export const toGameRecordListData = (dto: GameRecordListDto): GameRecordListData => ({
  total: dto.total,
  page: dto.page,
  podium: dto.podium.map(toGameRecordItemData),
  rankings: dto.rankings.map(toGameRecordItemData),
});

export const GameRecordConverter = {
  toGameRecordListData,
};
