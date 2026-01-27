'use client';

import { useParams } from 'next/navigation';
import styles from './page.module.css';
import BeakerGameScreen from '@/app/features/game/components/beaker/BeakerGameScreen';

export default function GamePage() {
  const params = useParams();
  const roomId = params.roomId as string;

  return (
    <div className={styles.content}>
      <BeakerGameScreen roomId={roomId} />
    </div>
  );
}
