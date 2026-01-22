'use client';

import { SecondaryChip } from '@/app/components/shared/chip/Chip';
import { roomStore, RoomStore } from '@/app/features/room/stores/room';
import { ParticipantData } from '@/app/features/room/dtos/data';
import { AuthStore, authStore } from '@/app/features/user/stores/auth';
import { useVoiceChat } from '@/app/features/voice/hooks/useVoiceChat';
import { useEffect, useMemo, useRef, useState } from 'react';
import styles from './chat.module.css';
import VoiceParticipantCard from './VoiceParticipantCard';

function RemoteAudioPlayer({ stream, volume }: { stream: MediaStream; volume: number }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.srcObject = stream;
      audioRef.current.volume = volume;
    }
  }, [stream, volume]);
  return <audio ref={audioRef} autoPlay style={{ display: 'none' }} />;
}

export default function RoomVoiceChat() {
  const [isHydrated, setIsHydrated] = useState(
    authStore.persist.hasHydrated() && roomStore.persist.hasHydrated(),
  );

  const myId = authStore((state: AuthStore) => state.userId);
  const me = authStore((state: AuthStore) => state.user);
  const roomData = roomStore((state: RoomStore) => state.roomData);
  const roomId = roomStore((state) => state.roomId);
  const isJoined = roomStore((state) => state.isJoined);

  // 1. participants를 useMemo로 정의 (나를 제외한 목록)
  const participants = useMemo(() => {
    return roomData?.participants?.filter((p) => p.userId !== myId) ?? [];
  }, [roomData?.participants, myId]);

  // 2. 위에서 메모이제이션된 participants를 사용하여 ID 문자열 생성
  const participantIds = useMemo(() => {
    return participants.map((p) => p.userId).join(',');
  }, [participants]);

  const currentParticipants = roomData?.currentParticipants;
  const maxParticipants = roomData?.maxParticipants;
  const showChip = currentParticipants || maxParticipants;
  const { voiceUsers, isMyMicOn, toggleMic, toggleUserAudio, changeUserVolume } = useVoiceChat(
    roomId,
    isJoined,
  );

  useEffect(() => {
    // mount/refresh 시 필요한 로직
  }, [participantIds]);

  useEffect(() => {
    if (isHydrated) return;
    const handleHydrated = () => {
      const hasHydrated = authStore.persist.hasHydrated() && roomStore.persist.hasHydrated();
      if (hasHydrated) setIsHydrated(true);
    };

    handleHydrated();
    const unsubAuth = authStore.persist.onFinishHydration(handleHydrated);
    const unsubRoom = roomStore.persist.onFinishHydration(handleHydrated);
    return () => {
      unsubAuth?.();
      unsubRoom?.();
    };
  }, [isHydrated]);

  if (!isHydrated) {
    return (
      <div className={styles.roomVoiceChat}>
        <div className={styles.header}>
          <h3 className={styles.title}>참여자 목록</h3>
        </div>
        <div className={styles.content}>
          <div className={styles.emptyState}>참여자 정보를 불러오는 중...</div>
        </div>
      </div>
    );
  }

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
              micOn={isMyMicOn}
              onMicChange={toggleMic}
              active={false}
              isHost={roomData?.hostId === me.id}
            />
          )}
          {participants.map((p: ParticipantData) => {
            const voiceInfo = voiceUsers[p.userId];
            const userVolume = voiceInfo?.volume !== undefined ? voiceInfo.volume * 100 : 50; // 기본값 50

            return (
              <div key={p.userId}>
                <VoiceParticipantCard
                  nickname={p.nickname}
                  profileImage={p.profileImage}
                  micOn={voiceInfo?.isMicOn ?? false}
                  speakerOn={voiceInfo?.isSpeakerOn ?? true}
                  volume={userVolume} // 볼륨 값 전달
                  onSliderChange={(val) => changeUserVolume(p.userId, val)}
                  onSpeakerChange={(val) => toggleUserAudio(p.userId, val)}
                  isHost={roomData?.hostId === p.userId}
                />
                {voiceInfo?.stream && voiceInfo.isSpeakerOn && (
                  <RemoteAudioPlayer stream={voiceInfo.stream} volume={voiceInfo.volume ?? 0.5} />
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
