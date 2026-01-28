'use client';

import { useEffect, useState } from 'react';
import styles from './page.module.css';
import GameResultPodium from '@/app/features/game/components/podium/GameResultPodium';
import RankingTable from '@/app/features/game/components/ranking/RankingTable';
import { RankingPageTitleSection } from '@/app/components/layout/pageTitleSection/PageTitleSection';
import type { GamePlayerResultRow } from '@/app/features/game/dtos/data';
import { RankingViewType } from '@/app/components/layout/pageTitleSection/type';
import { rankingStore } from '@/app/features/game/stores/ranking';
import { authStore } from '@/app/features/user/stores/auth';
import { loadingStore } from '@/app/features/loading/stores/loading';
import GoBackButton from '@/app/components/shared/button/GoBackButton';
import { goToRoomReplace } from '@/app/hooks/useNavigation';
import { useParams } from 'next/navigation';
import { roomStore } from '@/app/features/room/stores/room';

export default function RankingPage() {
  const params = useParams();
  const roomId = params.roomId as string;
  // const gameId = params.gameId as string;

  const [view, setView] = useState<RankingViewType>('group');
  const myId = authStore((s) => s.userId);
  const storedResult = rankingStore((state) => state.result);
  const { show, hide } = loadingStore();
  const players = storedResult?.results;

  const highlightRow = (row: GamePlayerResultRow) => row.playerId === myId;
  const setRoomIsGameRecruiting = roomStore((s) => s.setIsGameRecruiting);

  const handleGoBackClick = () => {
    if (!roomId) return;
    setRoomIsGameRecruiting(false);
    goToRoomReplace(roomId);
  };

  useEffect(() => {
    if (players) hide();
    else show();
  }, [players, show, hide]);

  if (!players) return null;

  return (
    <div className="content">
      <div className={styles.content}>
        <div className={styles.backButton}>
          <GoBackButton onClick={handleGoBackClick} />
        </div>
        <RankingPageTitleSection view={view} onChange={setView} />
        <div className={styles.podiumWarpper}>
          <GameResultPodium players={players} />
        </div>
        <div className={styles.tableWrapper}>
          <RankingTable data={players} highlightRow={highlightRow} />
        </div>
      </div>
    </div>
  );
}
