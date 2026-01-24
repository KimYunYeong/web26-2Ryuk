'use client';

import styles from './chat.module.css';
import { SecondaryChip } from '@/app/components/shared/chip/Chip';
import { roomStore, RoomStore } from '@/app/features/room/stores/room';
import { ParticipantData } from '@/app/features/room/dtos/data';
import { AuthStore, authStore } from '@/app/features/user/stores/auth';
import VoiceParticipantCard from './VoiceParticipantCard';

export default function RoomVoiceChat() {
  const myId = authStore((state: AuthStore) => state.userId);
  const me = authStore((state: AuthStore) => state.user);
  const roomData = roomStore((state: RoomStore) => state.roomData);
  const currentParticipants = roomData?.currentParticipants;
  const maxParticipants = roomData?.maxParticipants;
  const participants =
    roomData?.participants?.filter((p: ParticipantData) => p.userId !== myId) ?? [];
  const showChip = currentParticipants || maxParticipants;

  return (
    <div className={styles.roomVoiceChat}>
      <div className={styles.header}>
        <h3 className={styles.title}>참여자 목록</h3>
        <div className={styles.headerRight}>
          {showChip && (
            <SecondaryChip label={`${currentParticipants}/${maxParticipants}`} size="medium" />
          )}
        </div>
      </div>
      <div className={styles.content}>
        <div className={styles.participantsList}>
          {me && (
            <VoiceParticipantCard
              key="me"
              nickname={me.nickname}
              profileImage={me.profileImage}
              isMe
              // TODO:
              active={false}
              isHost={roomData?.hostId === me.id}
            />
          )}
          {participants.map((p: ParticipantData) => (
            <VoiceParticipantCard
              key={p.userId}
              nickname={p.nickname}
              profileImage={p.profileImage}
              // TODO:
              active={false}
              isMe={false}
              isHost={roomData?.hostId === p.userId}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
