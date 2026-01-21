'use client';

import { useCallback, useEffect, useState } from 'react';
import { gameService } from '@/app/features/game/services/GameService';
import { showInfoToast, useToast } from '@/app/components/shared/toast/useToast';
import { modalStore } from '@/app/components/shared/modal/modal.store';
import { roomStore } from '@/app/features/room/stores/room';
import { authStore } from '@/app/features/user/stores/auth';
import { GamePlayerData, GameJoinAckData } from '@/app/features/game/dtos/data';

export function useGame(roomId: string, isHost: boolean) {
  const { showSuccessToast, showErrorToast } = useToast();
  const [isGameRecruiting, setIsGameRecruiting] = useState(false);
  const [isReadyModalOpen, setIsReadyModalOpen] = useState(false);
  const roomData = roomStore((state) => state.roomData);
  const userId = authStore((state) => state.userId);
  const [gamePlayers, setGamePlayers] = useState<GamePlayerData[]>([]);
  const [myStatus, setMyStatus] = useState<GamePlayerData | null>(null);

  // 초기 방 정보에 isGameRecruiting이 포함되어 있으면 반영
  useEffect(() => {
    const recruiting = Boolean(roomData?.isGameRecruiting);
    setIsGameRecruiting(recruiting);
    if (recruiting && isHost && !isReadyModalOpen) {
      modalStore.getState().openModal('game-ready');
      setIsReadyModalOpen(true);
    }
  }, [roomData?.isGameRecruiting, isHost, isReadyModalOpen]);

  // 방 상세 players 정보를 초기 상태로 반영
  useEffect(() => {
    if (!roomData?.players) return;

    const others =
      roomData.players
        ?.filter((p) => p.userId !== userId)
        .map((p) => ({
          playerId: p.userId,
          nickname: p.nickname,
          profileImage: p.profileImage ?? '',
          isHost: p.isHost,
          isReady: p.isReady,
        })) ?? [];

    setGamePlayers(others);

    const me = roomData.players.find((p) => p.userId === userId) ?? {
      playerId: userId ?? '',
      nickname: '',
      profileImage: '',
      isHost,
      isReady: false,
    };
    setMyStatus(me);

    if (roomData.isGameRecruiting && isHost && !isReadyModalOpen) {
      modalStore.getState().openModal('game-ready');
      setIsReadyModalOpen(true);
    }
  }, [roomData?.players, roomData?.isGameRecruiting, userId, isHost, isReadyModalOpen]);

  useEffect(() => {
    const unsubscribeRecruit = gameService.onRecruit((data) => {
      setIsGameRecruiting(Boolean(data.isGameRecruiting));
      if (data.isGameRecruiting) {
        if (!isHost) showInfoToast('게임 모집이 시작되었습니다.');
        else {
          modalStore.getState().openModal('game-ready');
          setIsReadyModalOpen(true);
        }
      }
    });

    return () => {
      unsubscribeRecruit();
    };
  }, [showSuccessToast, isHost]);

  const applyJoinAck = (ackData: GameJoinAckData) => {
    const players = ackData.players.map((p) => ({
      ...p,
      isHost: p.userId === ackData.host.userId,
    }));

    const hasHost = players.some((p) => p.userId === ackData.host.userId);
    const mergedPlayers = hasHost ? players : [...players, ackData.host];
    setGamePlayers(mergedPlayers.filter((p) => p.userId !== userId));

    const me = mergedPlayers.find((p) => p.userId === userId) as GamePlayerData;
    setMyStatus(me);
  };

  useEffect(() => {
    const unsubscribePlayerJoin = gameService.onPlayerJoin((data) => {
      if (data.player.userId === userId) return;
      setGamePlayers((prev) => {
        const exists = prev.some((p) => p.userId === data.player.userId);
        const next = {
          ...data.player,
          isHost: data.player.userId === roomData?.hostId,
        };
        if (exists) return prev;
        return [...prev, next];
      });
    });

    return () => {
      unsubscribePlayerJoin();
    };
  }, [roomData?.hostId]);

  const handleGameRecruitClick = useCallback(async () => {
    if (!roomId) return;

    try {
      if (isHost) {
        await gameService.recruit(roomId);
        const ack = await gameService.join(roomId);
        applyJoinAck(ack);
        setIsGameRecruiting(true);
        showSuccessToast('게임 모집을 시작했습니다.');
        modalStore.getState().openModal('game-ready');
        setIsReadyModalOpen(true);
        return;
      }

      if (!isGameRecruiting) {
        showErrorToast('게임 모집 중이 아닙니다.');
        return;
      }

      const ack = await gameService.join(roomId);
      applyJoinAck(ack);
      showSuccessToast('게임 모집에 참여했습니다.');
      modalStore.getState().openModal('game-ready');
      setIsReadyModalOpen(true);
    } catch (error) {
      console.error('[useGame] 게임 요청 실패:', error);
      showErrorToast('게임 요청에 실패했습니다.');
    }
  }, [roomId, isHost, isGameRecruiting, showErrorToast, showSuccessToast, applyJoinAck]);

  const closeReadyModal = useCallback(() => {
    modalStore.getState().closeModal('game-ready');
    setIsReadyModalOpen(false);
  }, []);

  return {
    isGameRecruiting,
    isReadyModalOpen,
    handleGameRecruitClick,
    closeReadyModal,
    myStatus: myStatus ?? {
      playerId: userId ?? '',
      nickname: '',
      profileImage: '',
      isHost,
      isReady: false,
    },
    gamePlayers,
  };
}
