'use client';

import { useEffect, useRef } from 'react';
import { roomStore } from '@/app/features/room/stores/room';
import { useRoomEntry } from '@/app/features/room/hooks/roomEntry';
import { useRoomExit } from '@/app/features/room/hooks/roomExit';
import { useGame } from '@/app/features/game/hooks/game';
import { useToast } from '@/app/components/shared/toast/useToast';
import useNavigation from '@/app/hooks/useNavigation';
import { UseRoomResult } from '@/app/features/room/hooks/type';
import { roomChatService } from '@/app/features/chat/services/RoomChatService';
import { globalChatService } from '@/app/features/chat/services/GlobalChatService';
import { gameService } from '@/app/features/game/services/GameService';

export function useRoom(roomId?: string): UseRoomResult {
  const { showSuccessToast, showErrorToast } = useToast();
  const { goBack, goHome } = useNavigation();

  const hasShownEnterToastRef = useRef(false);
  const prevRoomIdForToastRef = useRef<string>();

  const roomData = roomStore((s) => s.roomData);

  const entry = useRoomEntry(roomId, {
    onAlreadyInOtherRoom: () => {
      showErrorToast('이미 소속 중인 방이 있습니다.');
      goHome();
    },
    onValidateFailed: (message) => {
      showErrorToast(message ?? '입장에 실패했습니다.');
      goHome();
    },
    onCancelPassword: goBack,
  });

  const game = useGame(roomId);

  // 입장 확정 후 채팅 및 게임 구독
  useEffect(() => {
    const isEntered = entry.status === 'entered';
    const isSameRoom = roomData?.id === roomId;

    //
    if (!isEntered || !roomId || !isSameRoom) return;

    //
    if (prevRoomIdForToastRef.current !== roomId) {
      prevRoomIdForToastRef.current = roomId;
      hasShownEnterToastRef.current = false;
    }

    //
    let cancelled = false;
    (async () => {
      await globalChatService.ensureConnected();
      if (cancelled) return;
      await roomChatService.subscribe(roomId);
      if (cancelled) return;
      await gameService.subscribe(roomId);
    })();

    if (entry.joinInfo && !entry.joinInfo.isMember && !hasShownEnterToastRef.current) {
      hasShownEnterToastRef.current = true;
      showSuccessToast('방에 입장했습니다!');
    }

    return () => {
      cancelled = true;
    };
  }, [entry.status, entry.joinInfo, roomId, roomData?.id]);

  useEffect(() => {
    return roomChatService.onRoomInvalidated(goHome);
  }, [goHome]);

  const exit = useRoomExit(roomId, {
    onLeaveSuccess: () => {
      showSuccessToast('퇴장했습니다!');
      goHome();
    },
    onDeleteSuccess: () => {
      showSuccessToast('방을 삭제했습니다!');
      goHome();
    },
  });

  return {
    roomData,
    entry,
    exit,
    game,
  };
}
