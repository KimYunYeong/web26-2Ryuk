'use client';

import { useEffect, useState } from 'react';
import useResponsive from '@/app/hooks/useResponsive';
import CSSUtil from '@/utils/css';
import styles from './page.module.css';
import RoomInfo from '@/app/features/room/components/info/RoomInfo';
import roomService from '@/app/features/room/services/RoomService';
import { RoomData } from '@/app/features/room/dtos/type';
import { RoomConverter } from '@/app/features/room/dtos/Room';
import { authStore } from '@/app/features/user/stores/auth';

interface RoomPageClientProps {
  roomId: string;
}

export default function RoomPageClient({ roomId }: RoomPageClientProps) {
  const { status } = useResponsive();
  const { userId } = authStore();
  const [room, setRoom] = useState<RoomData | null>(null);

  useEffect(() => {
    (async () => {
      const roomDto = await roomService.getRoom(roomId);
      setRoom(RoomConverter.toData(roomDto));
    })();
  }, [roomId]);

  const className = CSSUtil.buildCls('page', styles[status]);

  if (!room) return null;

  return (
    <div className={className}>
      <div className="content">
        <div className={styles.contentWrapper}>
          <RoomInfo title={room.title} tags={room.tags} isHost={userId === room.hostId} />
        </div>
      </div>
    </div>
  );
}
