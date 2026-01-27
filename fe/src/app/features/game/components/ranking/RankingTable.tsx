'use client';

'use client';

import Table from '@/app/components/table/Table';
import type { GamePlayerResultData } from '@/app/features/game/dtos/data';
import { rankingColumns } from './ranking.columns';

interface RankingTableProps {
  data: GamePlayerResultData[];
  highlightRow?: (row: GamePlayerResultData) => boolean;
}

export default function RankingTable({ data, highlightRow }: RankingTableProps) {
  const getRowKey = (row: GamePlayerResultData) => row.playerId;

  return (
    <Table columns={rankingColumns} data={data} getRowKey={getRowKey} highlightRow={highlightRow} />
  );
}
