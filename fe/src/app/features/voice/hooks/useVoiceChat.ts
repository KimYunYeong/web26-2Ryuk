import { VoiceService } from '@/app/features/voice/services/VoiceService';
import { useVoiceStore } from '@/app/features/voice/stores/voice';
import { useEffect } from 'react';

export function useVoiceChat(roomId: string | null, isJoined: boolean) {
  const { voiceUsers, isMyMicOn, setVoiceUser, removeVoiceUser, setMyMic } = useVoiceStore();

  useEffect(() => {
    // 룸 ID가 없거나 입장이 완료되지 않았다면 실행하지 않음
    if (!roomId || !isJoined) return;

    let isMounted = true;
    let unsubscribe: (() => void) | null = null;

    const init = async () => {
      try {
        // 1. 보이스 채널 입장 대기
        await VoiceService.joinVoiceChannel(roomId);

        if (!isMounted) return;

        // 2. 채널 입장 성공 후 즉시 알림 구독 시작 (순서 보장)
        unsubscribe = VoiceService.onStatusChange((payload) => {
          if (payload.action === 'remove') {
            removeVoiceUser(payload.userId);
          } else {
            setVoiceUser(payload.userId, {
              stream: payload.stream,
              isMicOn: payload.isMicOn,
            });
          }
        });

        // 3. 내 마이크 시작 및 로컬 상태 업데이트
        await VoiceService.startMic();

        if (isMounted) {
          setMyMic(true);
          console.log('✅ Voice Chat 연결 성공');
        }
      } catch (error) {
        console.error('❌ Voice Chat 초기화 실패:', error);
      }
    };

    init();

    // 클린업 함수
    return () => {
      isMounted = false;
      if (unsubscribe) {
        unsubscribe();
      }
      VoiceService.leaveChannel();
      console.log('🚪 Voice Chat 채널 퇴장');
    };
  }, [roomId, isJoined, setVoiceUser, removeVoiceUser, setMyMic]);

  // 내 마이크 토글 핸들러
  const toggleMic = async () => {
    try {
      const nextState = !isMyMicOn;
      // 서비스에는 미디어서버 일시정지 여부(pause)를 전달하므로 상태의 반대값 전송
      await VoiceService.toggleMic(!nextState);
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
        // targetState가 true(켜기)면 pause는 false(끄기)여야 함
        await VoiceService.toggleConsumer(consumer.id, !targetState);
        setVoiceUser(userId, { isSpeakerOn: targetState });
      }
    } catch (error) {
      console.error('상대방 소리 제어 실패:', error);
    }
  };

  // 특정 유저의 볼륨 조절 핸들러
  const changeUserVolume = (userId: string, volume: number) => {
    // UI의 0~100 값을 오디오 태그의 0.0~1.0 값으로 변환하여 저장
    setVoiceUser(userId, { volume: volume / 100 });
  };

  return { voiceUsers, isMyMicOn, toggleMic, toggleUserAudio, changeUserVolume };
}
