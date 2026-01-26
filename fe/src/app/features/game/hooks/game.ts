'use client';

import { useCallback, useEffect, useState } from 'react';
import { useToast } from '@/app/components/shared/toast/useToast';
import { modalStore } from '@/app/components/shared/modal/modal.store';
import { roomStore } from '@/app/features/room/stores/room';
import { authStore } from '@/app/features/user/stores/auth';
import { GameJoinAckData, GamePlayerData } from '@/app/features/game/dtos/data';
import { gameService } from '@/app/features/game/services/GameService';
import { UseGameResult } from '@/app/features/game/hooks/type';

type PData = GamePlayerData;

export function useGame(roomId?: string): UseGameResult {
  const { showSuccessToast, showInfoToast, showErrorToast } = useToast();

  const roomData = roomStore((s) => s.roomData);
  const userId = authStore((s) => s.userId);
  const isHost = roomData?.hostId === userId;

  const [isGameRecruiting, setIsGameRecruiting] = useState(false);
  const [isReadyModalOpen, setIsReadyModalOpen] = useState(false);
  const [gamePlayers, setGamePlayers] = useState<PData[]>([]);
  const [myStatus, setMyStatus] = useState<PData>();

  const initialMe: PData = {
    userId: userId ?? '',
    nickname: authStore.getState().user?.nickname ?? '',
    profileImage: authStore.getState().user?.profileImage ?? '',
    isHost,
    isReady: false,
  };

  const isMe = (playerId: string) => playerId === userId;
  const isHostPlayer = (playerId: string) => playerId === roomData?.hostId;
  const isSamePlayer = (a: PData, b: PData) => a.userId === b.userId;
  const withHostFlag = (p: PData): PData => ({ ...p, isHost: isHostPlayer(p.userId) });

  // room:player:recruit
  useEffect(() => {
    return gameService.onRecruit((data) => {
      setIsGameRecruiting(data.isGameRecruiting);

      if (!data.isGameRecruiting) return;
      if (!isHost) return showInfoToast('게임 모집이 시작되었습니다.');

      modalStore.getState().openModal('game-ready');
      setIsReadyModalOpen(true);
    });
  }, [isHost]);

  // game:join (ack)
  const applyJoinAck = useCallback((ack: GameJoinAckData) => {
    const hostId = ack.host.userId;
    const isPlayerHost = (p: PData) => p.userId === hostId;
    const addIsHost = (p: PData) => ({ ...p, isHost: isPlayerHost(p) });

    const players = ack.players.map(addIsHost);
    const hasHost = players.some(isPlayerHost);
    const merged = hasHost ? players : [...players, ack.host];

    const me = merged.find((p) => isMe(p.userId));
    const others = merged.filter((p) => !isMe(p.userId));

    setGamePlayers(others);
    setMyStatus(me ?? initialMe);
  }, []);

  // game:player:join, game:player:leave
  useEffect(() => {
    const addPlayerIfAbsent = (player: PData) => (prev: PData[]) =>
      prev.some((p) => isSamePlayer(p, player)) ? prev : [...prev, withHostFlag(player)];

    const removePlayer = (playerId: string) => (prev: PData[]) =>
      prev.filter((p) => p.userId !== playerId);

    const offJoin = gameService.onPlayerJoin(({ player }) => {
      if (isMe(player.userId)) return;
      setGamePlayers(addPlayerIfAbsent(player));
    });

    const offLeave = gameService.onPlayerLeave(({ playerId }) => {
      setGamePlayers(removePlayer(playerId));

      if (!isMe(playerId)) return;
      modalStore.getState().closeModal('game-ready');
    });

    return () => {
      offJoin();
      offLeave();
    };
  }, [userId, roomData?.hostId]);

  // game:player:ready, game:player:unready
  const updateReady = useCallback((playerId: string, isReady: boolean) => {
    setGamePlayers((prev) => prev.map((p) => (p.userId === playerId ? { ...p, isReady } : p)));

    setMyStatus((prev) => (prev && prev.userId === playerId ? { ...prev, isReady } : prev));
  }, []);

  useEffect(() => {
    const offReady = gameService.onReady((d) => updateReady(d.playerId, d.isReady));
    const offUnready = gameService.onUnready((d) => updateReady(d.playerId, d.isReady));

    return () => {
      offReady();
      offUnready();
    };
  }, [updateReady]);

  // game:player:close
  useEffect(() => {
    return gameService.onClose((data) => {
      if (data.isGameRecruiting) return;

      setIsGameRecruiting(false);
      setGamePlayers([]);
      modalStore.getState().closeModal('game-ready');

      isHost
        ? showSuccessToast('게임 모집을 종료했습니다.')
        : showInfoToast('게임 모집이 종료되었습니다.');
    });
  }, [isHost]);

  // actions
  const handleGameRecruitClick = useCallback(async () => {
    if (!roomId) return;

    try {
      if (isHost) {
        await gameService.recruit(roomId);
      } else if (!isGameRecruiting) {
        return showErrorToast('게임 모집 중이 아닙니다.');
      }

      const ack = await gameService.join(roomId);
      applyJoinAck(ack);

      modalStore.getState().openModal('game-ready');
      setIsReadyModalOpen(true);

      showSuccessToast(isHost ? '게임 모집을 시작했습니다.' : '게임에 참여했습니다.');
    } catch {
      showErrorToast('게임 요청에 실패했습니다.');
    }
  }, [roomId, isHost, isGameRecruiting]);

  const handleReadyChange = useCallback(
    (isReady: boolean) => {
      if (!roomId) return;

      isReady ? gameService.ready(roomId) : gameService.unready(roomId);
      setMyStatus((p) => (p ? { ...p, isReady } : p));
    },
    [roomId],
  );

  const handleLeaveGame = useCallback(async () => {
    if (!roomId) return;
    await gameService.leave(roomId);
    modalStore.getState().closeModal('game-ready');
  }, [roomId]);

  const handleCloseGame = useCallback(async () => {
    if (!roomId) return;
    isHost ? await gameService.close(roomId) : await handleLeaveGame();
  }, [roomId, isHost, handleLeaveGame]);

  return {
    myStatus: myStatus ?? initialMe,
    gamePlayers,
    isGameRecruiting,
    isReadyModalOpen,
    handleGameRecruitClick,
    handleReadyChange,
    handleLeaveGame,
    handleCloseGame,
  };
}
