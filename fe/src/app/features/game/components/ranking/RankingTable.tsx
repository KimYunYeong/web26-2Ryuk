'use client';

'use client';

import Table from '@/app/components/table/Table';
import type { GamePlayerResultData } from '@/app/features/game/dtos/data';
import { rankingColumns } from './ranking.columns';

interface RankingTableProps {
  data: GamePlayerResultData[];
}

export default function RankingTable({ data }: RankingTableProps) {
  const highlightRow = (row: GamePlayerResultData) => row.rank === 1;
  const getRowKey = (row: GamePlayerResultData) => row.playerId;

  return (
    <Table columns={rankingColumns} data={data} getRowKey={getRowKey} highlightRow={highlightRow} />
  );
}
