'use client';

import styles from './gameReadyModalContent.module.css';
import * as IconCircle from '@/app/components/shared/icon/IconCircle';
import {
  MyReadyStatusCardProps,
  OtherReadyStatusCardProps,
} from '@/app/features/room/components/type';
import MyReadyStatusCard from './MyReadyStatusCard';
import OtherReadyStatusCardGrid from './OtherReadyStatusCardGrid';
import SelectedGameCard from '@/app/features/game/components/SelectedGameCard';
import { GameData } from '@/app/features/game/dtos/data';
import * as TextButton from '@/app/components/shared/button/TextButton';
import { useState } from 'react';

interface GameReadyModalContentProps {
  myStatus: MyReadyStatusCardProps;
  participants: OtherReadyStatusCardProps[];
  selectedGame?: GameData;
  maxParticipants?: number;
  onChangeGame?: () => void;
  onReadyChange?: (value: boolean) => void;
  onStart?: () => void;
}

export default function GameReadyModalContent({
  myStatus,
  participants,
  maxParticipants,
  selectedGame,
  onChangeGame,
  onReadyChange,
  onStart,
}: GameReadyModalContentProps) {
  const currentCount = participants.length + 1;
  const title = myStatus.isHost ? '게임 참가자 모집 중' : '게임에 참가하시겠어요?';
  const [_isReady, setIsReady] = useState<boolean>(myStatus.isReady);

  const handleReadyChange = () => {
    if (myStatus.isHost) return;
    setIsReady((prev) => !prev);
    onReadyChange?.(_isReady);
  };

  return (
    <div className={styles.modal}>
      <div className={styles.header}>
        <IconCircle.Secondary name="game" size="medium" />
        <div className={styles.text}>
          <h2 className={styles.title}>{title}</h2>
          <p className={styles.subtitle}>
            참가자 현황 ({currentCount}/{maxParticipants})
          </p>
        </div>
      </div>
      <div className={styles.section}>
        <MyReadyStatusCard {...myStatus} />
      </div>
      <div className={styles.section}>
        <OtherReadyStatusCardGrid participants={participants} />
      </div>
      <div className={styles.section}>
        <SelectedGameCard game={selectedGame} isHost={myStatus.isHost} onChange={onChangeGame} />
      </div>
      <div className={styles.footer}>
        {myStatus.isHost && (
          <TextButton.Primary text="게임 시작" iconName="play" size="medium" onClick={onStart} />
        )}
        {!myStatus.isHost && _isReady && (
          <TextButton.SuccessSecondary
            iconName="check"
            text="준비 완료"
            size="medium"
            onClick={handleReadyChange}
          />
        )}
        {!myStatus.isHost && !_isReady && (
          <TextButton.SuccessPrimary text="준비" size="medium" onClick={handleReadyChange} />
        )}
        <p className={styles.notice}>게임 참여 여부와 관계없이 음성채팅은 지속됩니다</p>
      </div>
    </div>
  );
}
