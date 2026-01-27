'use client';

interface RankingRankCellProps {
  rank: number;
}

export default function RankingRankCell({ rank }: RankingRankCellProps) {
  return <span>{rank}</span>;
}
