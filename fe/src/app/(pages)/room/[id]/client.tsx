'use client';

import { useEffect, useState } from 'react';
import useResponsive from '@/app/hooks/useResponsive';
import CSSUtil from '@/utils/css';
import styles from './page.module.css';
import RoomInfo from '@/app/features/room/components/info/RoomInfo';
import roomService from '@/app/features/room/services/RoomService';
import { RoomDto } from '@/app/features/room/dtos/type';

interface RoomPageClientProps {
  roomId: string;
}

export default function RoomPageClient({ roomId }: RoomPageClientProps) {
  const { status } = useResponsive();
  const [room, setRoom] = useState<RoomDto | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const fetchRoom = async () => {
      const roomData = await roomService.getRoom(roomId);
      setRoom(roomData);
      setLoading(false);
    };
    fetchRoom();
  }, [roomId]);

  const className = CSSUtil.buildCls('page', styles[status]);

  if (loading) return <div className={className}>로딩 중...</div>;
  if (!room) return null;

  return (
    <div className={className}>
      <div className="content">
        <div className={styles.contentWrapper}>
          <RoomInfo title={room.title} tags={room.tags} />
        </div>
      </div>
    </div>
  );
}
