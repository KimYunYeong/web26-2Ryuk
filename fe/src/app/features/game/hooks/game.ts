'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useToast } from '@/app/components/shared/toast/useToast';
import { modalStore } from '@/app/components/shared/modal/modal.store';
import { roomStore } from '@/app/features/room/stores/room';
import { authStore } from '@/app/features/user/stores/auth';
import { GameJoinAckData, GamePlayerData as PData } from '@/app/features/game/dtos/data';
import { gameService } from '@/app/features/game/services/GameService';
import { UseGameResult } from '@/app/features/game/hooks/type';
import useNavigation from '@/app/hooks/useNavigation';
import { gameStore } from '@/app/features/game/stores/game';
import { watchDate } from '@/utils/watchDate';
import { rankingStore } from '@/app/features/game/stores/ranking';

interface ResultSnapshot {
  myScore: number;
  opponentScore: number;
  myRank?: number;
  highestScore?: number;
}

export function useGame(roomId?: string): UseGameResult {
  const { showSuccessToast, showInfoToast, showErrorToast } = useToast();

  const roomData = roomStore((s) => s.roomData);
  const userId = authStore((s) => s.userId);
  const user = authStore((s) => s.user);
  const isHost = roomData?.hostId === userId;
  const roomIsGameRecruiting = roomStore(
    (s) => s.isGameRecruiting || Boolean(s.roomData?.isGameRecruiting),
  );
  const setRoomIsGameRecruiting = roomStore((s) => s.setIsGameRecruiting);

  // GameStore 상태 구독
  const storeGameState = gameStore((s) => s.gameState);
  const startTime = gameStore((s) => s.startTime);
  const playDurationMs = gameStore((s) => s.playDurationMs);
  const delayMs = gameStore((s) => s.delayMs);
  const myScore = gameStore((s) => s.myScore);
  const highestScore = gameStore((s) => s.highestScore);
  const averageScore = gameStore((s) => s.averageScore);
  const ranks = gameStore((s) => s.ranks);
  const [resultSnapshot, setResultSnapshot] = useState<ResultSnapshot>();

  const clearResultSnapshot = useCallback(() => setResultSnapshot(undefined), []);
  const resetGameProgress = useCallback(() => {
    const currentSelectedGame = gameStore.getState().selectedGame;
    gameStore.getState().reset();
    if (currentSelectedGame) gameStore.getState().setSelectedGame(currentSelectedGame);
  }, []);

  const gameState = resultSnapshot ? 'result' : storeGameState;

  const initialMe = useCallback(
    (): PData => ({
      playerId: userId ?? '',
      nickname: user?.nickname ?? '',
      profileImage: user?.profileImage ?? '',
      isHost,
      isReady: false,
    }),
    [userId, user?.nickname, user?.profileImage, isHost],
  );

  const [isReadyModalOpen, setIsReadyModalOpen] = useState(false);
  const [gamePlayers, setGamePlayers] = useState<PData[]>([]);
  const [myStatus, setMyStatus] = useState<PData>(initialMe());
  const selectedGame = gameStore((s) => s.selectedGame);
  const setSelectedGame = gameStore((s) => s.setSelectedGame);
  const [remainingTime, setRemainingTime] = useState<number>(0);

  const isMe = (playerId: string) => playerId === userId;
  const isHostPlayer = (playerId: string) => playerId === roomData?.hostId;
  const isSamePlayer = (a: PData, b: PData) => a.playerId === b.playerId;
  const withHostFlag = (p: PData): PData => ({ ...p, isHost: isHostPlayer(p.playerId) });

  // 쓰로틀링 및 watchDate cleanup 관리
  const deltaRef = useRef<number>(0);
  const throttleTimerRef = useRef<NodeJS.Timeout>();
  const watchStartCleanupRef = useRef<(() => void) | null>(null);
  const watchEndCleanupRef = useRef<(() => void) | null>(null);
  const previousAverageScoreRef = useRef<number>(0);
  const [opponentDropTrigger, setOpponentDropTrigger] = useState<number>(0);
  const [myDropTrigger, setMyDropTrigger] = useState<number>(0);

  // user가 로드될 때 myStatus 업데이트 (게임에 참여하지 않은 상태에서만)
  useEffect(() => {
    if (!user || !userId) return;

    setMyStatus((prev) => {
      const participantAlreadyLoaded =
        prev.playerId === userId && prev.nickname && prev.nickname !== '';

      if (participantAlreadyLoaded) {
        const missingProfile = !prev.nickname || !prev.profileImage;
        if (!missingProfile) return prev;

        return {
          ...prev,
          nickname: user.nickname ?? prev.nickname,
          profileImage: user.profileImage ?? prev.profileImage,
        };
      }

      return {
        ...prev,
        playerId: userId,
        nickname: user.nickname ?? prev.nickname,
        profileImage: user.profileImage ?? prev.profileImage,
        isHost: prev.isHost ?? isHost,
      };
    });
  }, [user, userId, isHost]);

  useEffect(() => {
    setMyStatus((prev) => {
      if (!prev || prev.playerId !== userId) return prev;
      return { ...prev, isHost };
    });
  }, [isHost, userId]);

  // room:player:recruit
  useEffect(() => {
    return gameService.onRecruit((data) => {
      setSelectedGame(undefined);
      setRoomIsGameRecruiting(data.isGameRecruiting);
      if (!data.isGameRecruiting || isHost) return;
      showInfoToast('게임 모집이 시작되었습니다.');
    });
  }, [isHost, setRoomIsGameRecruiting]);

  // game:join (ack)
  const applyJoinAck = useCallback(
    (ack: GameJoinAckData) => {
      const hostId = ack.host.playerId;
      const isPlayerHost = (p: PData) => p.playerId === hostId;
      const addIsHost = (p: PData) => ({ ...p, isHost: isPlayerHost(p) });

      const players = ack.players.map(addIsHost);
      const hasHost = players.some(isPlayerHost);
      const merged = hasHost ? players : [...players, ack.host];

      const me = merged.find((p) => p.playerId === userId);
      const others = merged.filter((p) => p.playerId !== userId);

      setGamePlayers(others);
      setMyStatus(me ?? initialMe());
    },
    [initialMe, userId],
  );

  // game:player:join, game:player:leave
  useEffect(() => {
    const addPlayerIfAbsent = (player: PData) => (prev: PData[]) =>
      prev.some((p) => isSamePlayer(p, player)) ? prev : [...prev, withHostFlag(player)];

    const removePlayer = (playerId: string) => (prev: PData[]) =>
      prev.filter((p) => p.playerId !== playerId);

    // game:player:join
    const offJoin = gameService.onPlayerJoin((data) => {
      if (isMe(data.player.playerId)) return;
      setGamePlayers(addPlayerIfAbsent(data.player));
    });

    // game:player:leave
    const offLeave = gameService.onPlayerLeave((data) => {
      setGamePlayers(removePlayer(data.playerId));

      if (!isMe(data.playerId)) return;
      modalStore.getState().closeModal('game-ready');
    });

    return () => {
      offJoin();
      offLeave();
    };
  }, [userId, roomData?.hostId]);

  // game:player:ready, game:player:unready
  const updateReady = useCallback((playerId: string, isReady: boolean) => {
    setGamePlayers((prev) => prev.map((p) => (p.playerId === playerId ? { ...p, isReady } : p)));

    setMyStatus((prev) => (prev && prev.playerId === playerId ? { ...prev, isReady } : prev));
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

      setRoomIsGameRecruiting(data.isGameRecruiting);
      setGamePlayers([]);
      modalStore.getState().closeModal('game-ready');

      isHost
        ? showSuccessToast('게임 모집을 종료했습니다.')
        : showInfoToast('게임 모집이 종료되었습니다.');
    });
  }, [isHost, setRoomIsGameRecruiting]);

  // game:recruit
  const handleGameRecruit = useCallback(async () => {
    if (!roomId) return;

    try {
      await gameService.recruit(roomId);
      modalStore.getState().openModal('game-ready');
      setSelectedGame(undefined);
      setIsReadyModalOpen(true);
      showSuccessToast('게임 모집을 시작했습니다.');
    } catch {
      showErrorToast('게임 요청에 실패했습니다.');
    }
  }, [roomId, showSuccessToast, showErrorToast]);

  // game:join
  const handleGameJoin = useCallback(async () => {
    if (!roomId) return;

    try {
      if (!roomIsGameRecruiting) return showErrorToast('게임 모집 중이 아닙니다.');

      const ack = await gameService.join(roomId);
      applyJoinAck(ack);

      modalStore.getState().openModal('game-ready');
      setIsReadyModalOpen(true);

      showSuccessToast('게임에 참여했습니다.');
    } catch {
      showErrorToast('게임 요청에 실패했습니다.');
    }
  }, [roomId, roomIsGameRecruiting, showSuccessToast, showErrorToast]);

  useEffect(() => {
    if (!roomIsGameRecruiting || isReadyModalOpen || !isHost) return;

    modalStore.getState().openModal('game-ready');
    setIsReadyModalOpen(true);
  }, [roomIsGameRecruiting, isReadyModalOpen, isHost]);

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

  const { gotoGame, gotoRanking } = useNavigation();

  // game:select 게임 선택
  const handleGameSelect = useCallback(
    (gameId: string) => {
      if (!roomId || !gameId) return;
      gameService.select(roomId, gameId);
    },
    [roomId],
  );

  useEffect(() => {
    return gameService.onSelect((data) => {
      if (data) setSelectedGame(data.game ?? undefined);
      if (data.game) gameStore.getState().setPlayDurationMs(data.game.time);
    });
  }, [setSelectedGame]);

  // 방장이 게임 시작 버튼을 클릭
  const handleGameStartButtonClick = useCallback(() => {
    if (!roomId) return;
    gameService.startGame(roomId);
  }, [roomId]);

  const handleGameStart = useCallback(() => {
    gameStore.getState().setGameState('play');
    setIsReadyModalOpen(false);
  }, []);

  // 게임 종료 처리 함수
  const handleGameEnd = useCallback(() => {
    const state = gameStore.getState();
    setResultSnapshot({
      myScore: state.myScore,
      opponentScore: state.averageScore,
      myRank: userId ? state.ranks.indexOf(userId) + 1 : undefined,
      highestScore: state.highestScore,
    });

    // isGameStarted 제거하고 GameState 사용
    gameStore.getState().setGameState('result');

    // 스페이스바 입력 차단
    // delta 누적 중단
    // 쓰로틀링 타이머 제거
    if (throttleTimerRef.current) {
      clearInterval(throttleTimerRef.current);
      throttleTimerRef.current = undefined;
    }
    deltaRef.current = 0;

    // watchDate cleanup
    if (watchStartCleanupRef.current) {
      watchStartCleanupRef.current();
      watchStartCleanupRef.current = null;
    }
    if (watchEndCleanupRef.current) {
      watchEndCleanupRef.current();
      watchEndCleanupRef.current = null;
    }
  }, [resetGameProgress, userId]);

  // watchDate 설정 함수
  const setupWatchDates = useCallback(
    (start: Date, playDuration: number) => {
      // 기존 cleanup
      if (watchStartCleanupRef.current) {
        watchStartCleanupRef.current();
        watchStartCleanupRef.current = null;
      }
      if (watchEndCleanupRef.current) {
        watchEndCleanupRef.current();
        watchEndCleanupRef.current = null;
      }

      const endTime = new Date(start.getTime() + playDuration);
      const now = Date.now();
      const startTimeMs = start.getTime();

      // 현재 상태 계산
      if (now < startTimeMs) {
        // 아직 시작 전
        gameStore.getState().setGameState('ready');
      } else if (now >= endTime.getTime()) {
        // 이미 종료됨
        gameStore.getState().setGameState('result');
        return;
      } else {
        // 게임 진행 중
        gameStore.getState().setGameState('play');
        return; // 이미 진행 중이면 watchDate 등록 불필요
      }

      // watchDate 1: 게임 시작 감지
      watchStartCleanupRef.current = watchDate(start, handleGameStart);

      // watchDate 2: 게임 종료 감지
      watchEndCleanupRef.current = watchDate(endTime, handleGameEnd);
    },
    [handleGameEnd],
  );

  // game:player:start 처리 및 watchDate 설정
  useEffect(() => {
    return gameService.onStart((data) => {
      rankingStore.getState().clearResult();
      clearResultSnapshot();
      resetGameProgress();

      // GameStore에 시작 정보 저장
      const startTimeDate = data.startTime;
      gameStore.getState().setStartTime(startTimeDate);
      gameStore.getState().setPlayDurationMs(data.playDurationMs);
      gameStore.getState().setDelayMs(data.delayMs);
      gameStore.getState().setGameState('ready');

      // watchDate 설정 (startTime 변경으로 인한 중복 호출 방지를 위해 직접 호출)
      setupWatchDates(startTimeDate, data.playDurationMs);

      if (!roomId || !selectedGame?.id) return;
      gotoGame(roomId, selectedGame.id);
    });
  }, [roomId, selectedGame, gotoGame, setupWatchDates, clearResultSnapshot, resetGameProgress]);

  // 새로고침 후 복구: GameStore에서 상태 복구 및 watchDate 재등록
  useEffect(() => {
    const store = gameStore.getState();
    if (!store.startTime || !store.playDurationMs) return;

    // watchDate 재등록
    setupWatchDates(store.startTime, store.playDurationMs);

    return () => {
      if (watchStartCleanupRef.current) {
        watchStartCleanupRef.current();
        watchStartCleanupRef.current = null;
      }
      if (watchEndCleanupRef.current) {
        watchEndCleanupRef.current();
        watchEndCleanupRef.current = null;
      }
    };
  }, []);

  // game:player:realtime 처리
  useEffect(() => {
    return gameService.onRealtime((data) => {
      // isGameStarted 제거하고 GameState 사용
      if (gameStore.getState().gameState !== 'play') return;

      gameStore.getState().setHighestScore(data.highestScore);
      gameStore.getState().setAverageScore(data.averageScore);
      gameStore.getState().setRanks(data.ranks);

      // 상대 비커 dropTrigger 계산
      const currentAvg = data.averageScore;
      const prevAvg = previousAverageScoreRef.current;
      const scoreDiff = currentAvg - prevAvg;

      if (scoreDiff > 0) {
        const interval = 100 / scoreDiff;
        if (interval > 0 && isFinite(interval)) {
          setOpponentDropTrigger((prev) => prev + 1);
        }
      }

      previousAverageScoreRef.current = currentAvg;
    });
  }, []);

  // 쓰로틀링: 100ms마다 누적된 delta 전송
  useEffect(() => {
    if (gameState !== 'play' || !roomId) {
      if (throttleTimerRef.current) {
        clearInterval(throttleTimerRef.current);
        throttleTimerRef.current = undefined;
      }
      return;
    }

    throttleTimerRef.current = setInterval(() => {
      if (gameStore.getState().gameState !== 'play') {
        if (throttleTimerRef.current) {
          clearInterval(throttleTimerRef.current);
          throttleTimerRef.current = undefined;
        }
        deltaRef.current = 0;
        return;
      }

      if (deltaRef.current <= 0) return;
      gameService.realtimeInput(roomId, deltaRef.current);
      deltaRef.current = 0;
    }, 100);

    return () => {
      if (!throttleTimerRef.current) return;
      clearInterval(throttleTimerRef.current);
      throttleTimerRef.current = undefined;
    };
  }, [gameState, roomId]);

  // 스페이스바 입력 처리
  useEffect(() => {
    if (gameState !== 'play') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // isGameStarted 제거하고 GameState 사용
      if (gameStore.getState().gameState !== 'play') return;

      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault();
        // 낙관적 업데이트
        gameStore.getState().setMyScore(gameStore.getState().myScore + 1);
        setMyDropTrigger((prev) => prev + 1);

        // delta 누적
        deltaRef.current += 1;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState]);

  // game:player:result 처리
  useEffect(() => {
    return gameService.onResult((data) => {
      rankingStore.getState().setResult(data);

      handleGameEnd();

      if (!roomId || !selectedGame?.id) return;
      gotoRanking(roomId, selectedGame.id);
    });
  }, [handleGameEnd, gotoRanking, roomId, selectedGame?.id]);

  // 남은 시간 계산
  useEffect(() => {
    if (!startTime) {
      setRemainingTime(0);
      return;
    }

    const updateRemainingTime = () => {
      const now = Date.now();
      const startTimeMs = startTime.getTime();
      const endTimeMs = startTimeMs + playDurationMs;

      const currentState = gameStore.getState().gameState;

      let timeRemaining = 0;
      switch (currentState) {
        case 'ready':
          timeRemaining = Math.max(0, startTimeMs - now);
          break;
        case 'play':
          timeRemaining = Math.max(0, endTimeMs - now);
          break;
        case 'result':
          timeRemaining = 0;
          break;
      }
      setRemainingTime(timeRemaining);
    };

    updateRemainingTime();
    const interval = setInterval(updateRemainingTime, 100);

    return () => clearInterval(interval);
  }, [startTime, playDurationMs, gameState]);

  // 컴포넌트 unmount 시 cleanup
  useEffect(() => {
    return () => {
      if (throttleTimerRef.current) {
        clearInterval(throttleTimerRef.current);
        throttleTimerRef.current = undefined;
      }
      if (watchStartCleanupRef.current) {
        watchStartCleanupRef.current();
        watchStartCleanupRef.current = null;
      }
      if (watchEndCleanupRef.current) {
        watchEndCleanupRef.current();
        watchEndCleanupRef.current = null;
      }
      deltaRef.current = 0;
    };
  }, []);

  // 상대 점수 계산
  const isOneToOne = gamePlayers.length === 1;
  const storeOpponentScore = averageScore;
  const storeHighestScore = isOneToOne ? undefined : highestScore;

  // 내 랭킹 계산
  const storeMyRank = userId ? ranks.indexOf(userId) + 1 : undefined;

  const displayedMyScore = resultSnapshot?.myScore ?? myScore;
  const displayedOpponentScore = resultSnapshot?.opponentScore ?? storeOpponentScore;
  const displayedMyRank = resultSnapshot?.myRank ?? storeMyRank;
  const displayedOpponentHighestScore = resultSnapshot?.highestScore ?? storeHighestScore;

  return {
    myStatus: myStatus,
    gamePlayers,
    isGameRecruiting: roomIsGameRecruiting,
    isReadyModalOpen,
    handleGameRecruit,
    handleGameJoin,
    handleReadyChange,
    handleLeaveGame,
    handleCloseGame,
    handleGameSelect,
    handleGameStartButtonClick,
    gameState,
    selectedGame,
    remainingTime,
    playDurationMs,
    delayMs,
    myScore: displayedMyScore,
    opponentScore: displayedOpponentScore,
    opponentHighestScore: displayedOpponentHighestScore,
    myRank: displayedMyRank,
    myDropTrigger,
    opponentDropTrigger,
  };
}
