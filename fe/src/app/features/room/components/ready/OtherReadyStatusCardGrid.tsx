'use client';

import OtherReadyStatusCard, { EmptyOtherReadyStatusCard } from './OtherReadyStatusCard';
import styles from './readyStatusCard.module.css';
import { OtherReadyStatusCardProps } from '@/app/features/room/components/type';

interface OtherReadyStatusCardGridProps {
  participants: OtherReadyStatusCardProps[];
}

const TOTAL_SLOTS = 9;

export default function OtherReadyStatusCardGrid({ participants }: OtherReadyStatusCardGridProps) {
  const slots = [
    ...participants.slice(0, TOTAL_SLOTS),
    ...Array(Math.max(0, TOTAL_SLOTS - participants.length)).fill(null),
  ].slice(0, TOTAL_SLOTS);

  return (
    <div className={styles.otherGrid}>
      {slots.map((participant, index) =>
        !participant ? (
          <EmptyOtherReadyStatusCard key={`empty-ready-${index}`} />
        ) : (
          <OtherReadyStatusCard
            key={`other-ready-${participant.nickname + index}`}
            {...participant}
          />
        ),
      )}
    </div>
  );
}
