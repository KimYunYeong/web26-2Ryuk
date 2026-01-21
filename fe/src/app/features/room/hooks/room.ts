'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { roomStore, RoomStore } from '@/app/features/room/stores/room';
import roomService from '@/app/features/room/services/RoomService';
import { RoomConverter } from '@/app/features/room/dtos/converter';
import { RoomJoinInfoData } from '@/app/features/room/dtos/data';
import { authStore, AuthStore } from '@/app/features/user/stores/auth';
import { roomChatService } from '@/app/features/chat/services/RoomChatService';
import { useToast } from '@/app/components/shared/toast/useToast';
import useNavigation from '@/app/hooks/useNavigation';

export interface UseRoomResult {
  roomData: RoomStore['roomData'];
  roomJoinInfoData: RoomJoinInfoData | null;
  isHost: boolean;
  showPasswordAuth: boolean;
  handlePasswordConfirm: (password: string) => Promise<void>;
  handlePasswordCancel: () => void;
}

export function useRoom(roomId: string): UseRoomResult {
  const { showSuccessToast, showErrorToast } = useToast();
  const { goBack, goHome } = useNavigation();

  const roomData = roomStore((state: RoomStore) => state.roomData);
  const userId = authStore((state: AuthStore) => state.userId);

  const [roomJoinInfoData, setRoomJoinInfoData] = useState<RoomJoinInfoData | null>(null);
  const [showPasswordAuth, setShowPasswordAuth] = useState(false);
  const [isHost, setIsHost] = useState(false);

  const hasInitialized = useRef(false);

  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    const syncFromBe = async () => {
      if (!userId) {
        showErrorToast('로그인 후 이용해주세요.');
        goHome();
        return;
      }

      if (!roomId) return;

      try {
        // 1. 입장 정보
        const joinInfoDto = await roomService.getRoomJoinInfo(roomId);
        const joinInfoData = RoomConverter.toRoomJoinInfoData(joinInfoDto);
        setRoomJoinInfoData(joinInfoData);

        // 2. 방 정보
        const roomDto = await roomService.getRoom(roomId);
        const convertedRoom = RoomConverter.toData(roomDto);
        roomStore.getState().setRoomData(convertedRoom);
        setIsHost(convertedRoom.hostId === userId);

        // 3. 비회원 + 비공개
        if (!joinInfoData.isMember && joinInfoData.isPrivate) {
          setShowPasswordAuth(true);
          return;
        }

        // 4. 입장 처리
        if (!joinInfoData.isMember) {
          await roomService.validateJoin(roomId);
          await roomChatService.subscribe(roomId);
          showSuccessToast('방에 입장했습니다!');
          return;
        }

        await roomChatService.subscribe(roomId);
      } catch {
        roomStore.getState().leaveRoom();
        roomChatService.clearSubscriptionOnly();
        goHome();
      }
    };

    const unsubInvalidated = roomChatService.onRoomInvalidated(goHome);
    syncFromBe();

    return () => unsubInvalidated();
  }, [roomId, userId, goHome, showSuccessToast, showErrorToast]);

  const handlePasswordConfirm = useCallback(
    async (password: string) => {
      await roomService.validateJoin(roomId, password);
      setShowPasswordAuth(false);
      showSuccessToast('방에 입장했습니다!');

      await roomChatService.subscribe(roomId);

      const roomDto = await roomService.getRoom(roomId);
      const convertedRoom = RoomConverter.toData(roomDto);
      roomStore.getState().setRoomData(convertedRoom);
      setIsHost(convertedRoom.hostId === userId);
    },
    [roomId, userId, showSuccessToast],
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
  };
}
