// 게임 랭킹 조회 응답
export class GameRecordRankItemDto {
  user_id: string;
  nickname: string;
  profile_image: string | null;
  score: number;
  rank: number;
  achieve_date: Date;
}

export class GameRecordRankResponseDto {
  total: number;
  page: number;
  podium: GameRecordRankItemDto[];
  rankings: GameRecordRankItemDto[];
}
