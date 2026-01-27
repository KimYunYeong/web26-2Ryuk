'use client';

import DateUtil from '@/utils/date';

interface RankingAchieveDateCellProps {
  achieveDate?: Date | null;
}

export default function RankingAchieveDateCell({ achieveDate }: RankingAchieveDateCellProps) {
  const text = DateUtil.describe(achieveDate);
  return <span>{text}</span>;
}
