'use client';

import { useEffect, useState } from 'react';
import useResponsive from '@/app/hooks/useResponsive';
import styles from './page.module.css';
import RoomInfoWithModal from '@/app/features/room/components/info/RoomInfoWithModal';
import roomService from '@/app/features/room/services/RoomService';
import { RoomData, RoomEditData } from '@/app/features/room/dtos/type';
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

  if (!room) return null;

  const handleUpdate = (data: RoomEditData) => {
    if (!room) return;

    setRoom({
      ...room,
      title: data.title,
      tags: data.tags,
      maxParticipants: data.maxParticipants,
      isMicAvailable: data.isMicAvailable,
      isPrivate: data.isPrivate,
    });
  };

  return (
    <div className={styles[status]}>
      <div className="content">
        <div className={styles.contentWrapper}>
          <RoomInfoWithModal
            roomId={room.id}
            {...room}
            isHost={userId === room.hostId}
            onUpdate={handleUpdate}
          />
        </div>
      </div>
    </div>
  );
}
