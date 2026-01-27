'use client';

import DateUtil from '@/utils/date';

interface RankingAchieveDateCellProps {
  achieveDate?: Date | null;
}

export default function RankingAchieveDateCell({ achieveDate }: RankingAchieveDateCellProps) {
  if (!achieveDate) {
    return <span>-</span>;
  }

  const now = new Date();
  const diffMs = now.getTime() - achieveDate.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);

  let text: string;

  if (diffSeconds < 60) {
    text = `${diffSeconds}초전`;
  } else if (diffSeconds < 60 * 60) {
    const minutes = Math.floor(diffSeconds / 60);
    text = `${minutes}분전`;
  } else if (diffSeconds < 60 * 60 * 24) {
    const hours = Math.floor(diffSeconds / (60 * 60));
    text = `${hours}시간전`;
  } else {
    text = DateUtil.format(achieveDate, { format: 'YYYY. MM. DD', fallback: '-' });
  }

  return <span>{text}</span>;
}
