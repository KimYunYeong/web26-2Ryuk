'use client';

import { GamePageTitleSection } from '@/app/components/layout/pageTitleSection/PageTitleSection';
import RemainingTimeBar from '@/app/components/shared/remainingTimeBar/RemainingTimeBar';
import BeakerFillView from '@/app/features/game/components/beaker/BeakerFillView';
import styles from './BeakerGameScreen.module.css';
import { useGame } from '@/app/features/game/hooks/game';
import Rules from '@/app/shared/rule';
import IS from '@/utils/is';
import { GAME_IDS } from '@/app/shared/constant';

const DEFAULT_MAX_LEVEL = Rules.GAME.BEAKER.MAX_LEVEL;

interface BeakerGameScreenProps {
  roomId?: string;
}

export default function BeakerGameScreen({ roomId }: BeakerGameScreenProps) {
  const gameId = GAME_IDS.BEAKER;

  const {
    gameState,
    remainingTime,
    durationMs,
    myScore,
    opponentScore,
    opponentHighestScore,
    myRank,
    myDropTrigger,
    opponentDropTrigger,
  } = useGame(roomId);

  const buildTimeBar = () => {
    switch (gameState) {
      case 'ready':
        return (
          <RemainingTimeBar
            label="준비 시간"
            variant="secondary"
            totalDurationMs={3000}
            remainingMs={remainingTime}
          />
        );
      case 'play':
        return (
          <RemainingTimeBar
            label="남은 시간"
            variant="primary"
            totalDurationMs={durationMs}
            remainingMs={remainingTime}
          />
        );
    }
    return null;
  };

  const buildStats = () => {
    if (IS.nil(myRank) && IS.nil(myScore) && IS.nil(opponentScore)) return null;
    return (
      <div className={styles.statsWrapper}>
        {!IS.nil(myRank) && (
          <div className={styles.rankingWrapper}>
            <span className={styles.rankingLabel}>현재</span>
            <span className={styles.rankingValue}>{myRank}등</span>
          </div>
        )}
        {!IS.nil(myScore) && (
          <div className={styles.scoreRow}>
            <div className={styles.scoreColumn}>
              <span className={styles.scoreLabel}>내 점수</span>
              <span className={styles.scoreValue}>{myScore}</span>
            </div>
          </div>
        )}
        {!IS.nil(opponentScore) && (
          <div className={styles.scoreRow}>
            <div className={styles.scoreColumn}>
              <span className={styles.scoreLabel}>상대 점수</span>
              <span className={styles.scoreValue}>{opponentScore}</span>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <section className={styles.screen}>
      <GamePageTitleSection gameId={gameId} />
      <div className={styles.timerWrapper}>{buildTimeBar()}</div>
      {buildStats()}
      <div className={styles.gameContent}>
        <div className={styles.beakerGroup}>
          <BeakerFillView
            type="me"
            dropTrigger={myDropTrigger}
            score={myScore}
            maxLevel={DEFAULT_MAX_LEVEL}
          />
          <BeakerFillView
            type="other"
            dropTrigger={opponentDropTrigger}
            score={opponentScore}
            maxLevel={DEFAULT_MAX_LEVEL}
            highestScore={opponentHighestScore}
          />
        </div>
        <div className={styles.beakerLabelRow}>
          <span>내 비커</span>
          <span>상대 비커</span>
        </div>
      </div>
    </section>
  );
}
