'use client';

export type GameRecordItemDto = {
  player_id: string;
  rank: number;
  nickname: string;
  profile_image?: string;
  score: number;
  achieve_date: string;
};

export type GameRecordListDto = {
  total: number;
  page: number;
  podium: GameRecordItemDto[];
  rankings: GameRecordItemDto[];
};
