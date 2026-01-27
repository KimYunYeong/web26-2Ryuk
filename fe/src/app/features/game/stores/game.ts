'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type GameState = 'ready' | 'play' | 'result';

interface GameStoreState {
  gameState: GameState;
  startTime?: Date;
  durationMs: number;
  myScore: number;
  highestScore?: number;
  averageScore: number;
  ranks: string[];
}

interface GameStoreActions {
  setGameState: (state: GameState) => void;
  setStartTime: (startTime?: Date) => void;
  setDurationMs: (durationMs: number) => void;
  setMyScore: (score: number) => void;
  setHighestScore: (score?: number) => void;
  setAverageScore: (score: number) => void;
  setRanks: (ranks: string[]) => void;
  reset: () => void;
}

export type GameStore = GameStoreState & GameStoreActions;

const GAME_STORAGE_KEY = 'game-storage';

const removePersistedGameState = () => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(GAME_STORAGE_KEY);
};

const initialState: GameStoreState = {
  gameState: 'ready',
  startTime: undefined,
  durationMs: 30000,
  myScore: 0,
  highestScore: undefined,
  averageScore: 0,
  ranks: [],
};

export const gameStore = create<GameStore>()(
  persist(
    (set) => ({
      ...initialState,
      setGameState: (gameState: GameState) => set({ gameState }),
      setStartTime: (startTime?: Date) => set({ startTime }),
      setDurationMs: (durationMs: number) => set({ durationMs }),
      setMyScore: (myScore: number) => set({ myScore }),
      setHighestScore: (highestScore?: number) => set({ highestScore }),
      setAverageScore: (averageScore: number) => set({ averageScore }),
      setRanks: (ranks: string[]) => set({ ranks }),
      reset: () => {
        removePersistedGameState();
        set(initialState);
      },
    }),
    {
      name: GAME_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        gameState: state.gameState,
        startTime: state.startTime ? state.startTime.toISOString() : undefined,
        durationMs: state.durationMs,
        myScore: state.myScore,
        highestScore: state.highestScore,
        averageScore: state.averageScore,
        ranks: state.ranks,
      }),
      // Date 객체 복구 처리
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        if (state.startTime && typeof state.startTime === 'string') {
          state.startTime = new Date(state.startTime);
        }
      },
    },
  ),
);
