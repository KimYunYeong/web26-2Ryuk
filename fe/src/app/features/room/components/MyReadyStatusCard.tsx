'use client';

import Avatar from '@/app/components/shared/profile/Avatar';
import HostBadge from '@/app/components/shared/badge/HostBadge';
import * as Chip from '@/app/components/shared/chip/Chip';
import styles from './myReadyStatusCard.module.css';
import Profile from '@/app/components/shared/profile/Profile';
import CSSUtil from '@/utils/css';

interface MyReadyStatusCardProps {
  nickname: string;
  profileImage?: string;
  isHost: boolean;
  isReady: boolean;
}

export default function MyReadyStatusCard({
  nickname,
  profileImage,
  isHost,
  isReady,
}: MyReadyStatusCardProps) {
  const className = CSSUtil.buildCls(
    styles.card,
    isHost && styles.isHost,
    !isHost && isReady && styles.ready,
  );

  const readyChip = <Chip.SuccessPrimary label="READY" size="small" />;
  const waitChip = <Chip.Default label="대기 중" size="small" />;

  return (
    <div className={className}>
      <div className={styles.header}>
        <Profile nickname={nickname} profileImage={profileImage} />
        {isHost && <HostBadge />}
        <Chip.Primary label="나" size="small" />
      </div>
      {!isHost && (isReady ? readyChip : waitChip)}
    </div>
  );
}
