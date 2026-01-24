// features/room/hooks/room.ts
'use client';

import { useEffect, useState, useCallback } from 'react';
import { roomStore } from '@/app/features/room/stores/room';
import { authStore } from '@/app/features/user/stores/auth';
import * as roomEntry from '@/app/features/room/utils/roomEntry';
import * as roomActions from '@/app/features/room/utils/roomActions';
import { useGame } from '@/app/features/game/hooks/game';
import { useToast } from '@/app/components/shared/toast/useToast';
import useNavigation from '@/app/hooks/useNavigation';
import { RoomJoinInfoData } from '@/app/features/room/dtos/data';
import { UseRoomResult } from '@/app/features/room/hooks/type';

export function useRoom(roomId: string): UseRoomResult {
  const { showSuccessToast } = useToast();
  const { goHome, goBack } = useNavigation();

  const userId = authStore((s) => s.userId) ?? undefined;
  const roomData = roomStore((s) => s.roomData);

  const [roomJoinInfoData, setRoomJoinInfoData] = useState<RoomJoinInfoData>();
  const [showPasswordAuth, setShowPasswordAuth] = useState(false);
  const [isHost, setIsHost] = useState(false);

  const game = useGame(roomId, isHost);

  // 초기 진입
  useEffect(() => {
    if (!roomId || !userId) return;

    (async () => {
      try {
        // 방 입장 가능 여부 조회
        const joinInfo = await roomEntry.fetchRoomJoinInfo(roomId);
        setRoomJoinInfoData(joinInfo);

        // 방 세션 진입
        const result = await roomEntry.enterRoomSession(roomId, joinInfo, userId);

        // 비밀번호 인증 필요
        if (result.needPassword) return setShowPasswordAuth(true);

        // 방장 여부 설정
        setIsHost(result.isHost);

        showSuccessToast('방에 입장했습니다!');
      } catch {
        await roomActions.leaveRoom();
        goHome();
      }
    })();
  }, [roomId, userId]);

  // 비밀번호 인증
  const handlePasswordConfirm = useCallback(
    async (password: string) => {
      await roomEntry.enterRoomWithPassword(roomId, password, userId);
      setShowPasswordAuth(false);
      showSuccessToast('방에 입장했습니다!');
    },
    [roomId, userId],
  );

  const handlePasswordCancel = useCallback(() => {
    setShowPasswordAuth(false);
    goBack();
  }, [goBack]);

  return {
    roomData,
    roomJoinInfoData,
    isHost,
    showPasswordAuth,
    handlePasswordConfirm,
    handlePasswordCancel,
    game,
  };
}
