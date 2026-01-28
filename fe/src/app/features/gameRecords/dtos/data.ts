'use client';

export type GameRecordItemData = {
  playerId: string;
  rank: number;
  nickname: string;
  profileImage?: string;
  score: number;
  achieveDate: Date;
};

export type GameRecordListData = {
  total: number;
  page: number;
  podium: GameRecordItemData[];
  rankings: GameRecordItemData[];
};
