'use client';

import useResponsive from '@/app/hooks/useResponsive';
import '@/app/page.css';
import styles from './page.module.css';
import RoomInfoWithModal from '@/app/features/room/components/info/RoomInfoWithModal';
import RoomTextChat from '@/app/features/room/components/chat/RoomTextChat';
import RoomVoiceChat from '@/app/features/room/components/chat/RoomVoiceChat';
import PasswordAuthDialog from '@/app/features/room/components/PasswordAuthDialog';
import LeaveRoomButtonWithModal from '@/app/features/room/components/LeaveRoomButtonWithModal';
import DeleteRoomButtonWithModal from '@/app/features/room/components/DeleteRoomButtonWithModal';
import GameStartButton from '@/app/features/room/components/GameStartButton';
import { useParams } from 'next/navigation';
import { useRoom } from '@/app/features/room/hooks/room';

export default function RoomPage() {
  const params = useParams();
  const roomId = params.id as string;

  const { status } = useResponsive();

  const {
    roomData,
    roomJoinInfoData,
    isHost,
    showPasswordAuth,
    handlePasswordConfirm,
    handlePasswordCancel,
  } = useRoom(roomId);

  return (
    <>
      {isHost ? <DeleteRoomButtonWithModal /> : <LeaveRoomButtonWithModal />}

      <div className={styles[status]}>
        <div className="content">
          <div className={styles.content}>
            <div className={styles.left}>
              <RoomInfoWithModal
                roomId={roomId}
                title={roomData?.title ?? roomJoinInfoData?.title}
                tags={roomData?.tags ?? roomJoinInfoData?.tags}
                isHost={isHost}
                isMicAvailable={roomData?.isMicAvailable ?? roomJoinInfoData?.isMicAvailable}
                isPrivate={roomData?.isPrivate ?? roomJoinInfoData?.isPrivate}
                maxParticipants={roomData?.maxParticipants}
              />
              <RoomTextChat />
            </div>

            <div className={styles.right}>
              <RoomVoiceChat />
              <GameStartButton disabled={!isHost} />
            </div>
          </div>
        </div>
      </div>

      <PasswordAuthDialog
        isOpen={showPasswordAuth}
        onConfirm={handlePasswordConfirm}
        onCancel={handlePasswordCancel}
      />
    </>
  );
}
