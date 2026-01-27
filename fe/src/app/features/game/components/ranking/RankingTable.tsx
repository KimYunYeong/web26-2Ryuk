'use client';

import Table from '@/app/components/table/Table';
import type { GamePlayerResultRow } from '@/app/features/game/dtos/data';
import { rankingColumns } from './ranking.columns';

interface RankingTableProps {
  data: GamePlayerResultRow[];
  highlightRow?: (row: GamePlayerResultRow) => boolean;
}

export default function RankingTable({ data, highlightRow }: RankingTableProps) {
  const getRowKey = (row: GamePlayerResultRow) => row.playerId;

  return (
    <Table columns={rankingColumns} data={data} getRowKey={getRowKey} highlightRow={highlightRow} />
  );
}
