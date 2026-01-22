import { VoiceService } from '@/app/features/voice/services/VoiceService';
import { useVoiceStore } from '@/app/features/voice/stores/voice';
import { useEffect } from 'react';

export function useVoiceChat(roomId: string | null, isJoined: boolean) {
  const { voiceUsers, isMyMicOn, setVoiceUser, removeVoiceUser, setMyMic } = useVoiceStore();

  useEffect(() => {
    if (!roomId || !isJoined) return;

    let isMounted = true; // 마운트 상태 추적

    // 1. 보이스 채널 입장
    const init = async () => {
      await VoiceService.joinVoiceChannel(roomId);

      if (!isMounted) return;

      await VoiceService.startMic();
      setMyMic(true);
    };

    init();

    // 2. 서비스 알림 구독
    const unsubscribe = VoiceService.onStatusChange((payload) => {
      if (payload.action === 'remove') {
        removeVoiceUser(payload.userId);
      } else {
        // add 또는 update 시 스토어 업데이트
        setVoiceUser(payload.userId, {
          stream: payload.stream,
          isMicOn: payload.isMicOn,
        });
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
      VoiceService.leaveChannel();
    };
  }, [roomId, isJoined]);

  // 내 마이크 토글 핸들러
  const toggleMic = async () => {
    try {
      const nextState = !isMyMicOn;
      await VoiceService.toggleMic(!nextState); // 서비스에 pause(true/false) 전달
      setMyMic(nextState);
    } catch (error) {
      console.error('마이크 제어 실패:', error);
    }
  };

  // 상대방 소리 수신 토글 핸들러
  const toggleUserAudio = async (userId: string, targetState: boolean) => {
    try {
      const consumer = VoiceService.getConsumerByUserId(userId);
      if (consumer) {
        await VoiceService.toggleConsumer(consumer.id, !targetState);
        setVoiceUser(userId, { isSpeakerOn: targetState });
      }
    } catch (error) {
      console.error('상대방 소리 제어 실패:', error);
    }
  };

  // 특정 유저의 볼륨 조절 핸들러
  const changeUserVolume = (userId: string, volume: number) => {
    // 스토어에 볼륨 값 저장 (0.0 ~ 1.0 사이 값으로 변환 필요)
    setVoiceUser(userId, { volume: volume / 100 });
  };

  return { voiceUsers, isMyMicOn, toggleMic, toggleUserAudio, changeUserVolume };
}
