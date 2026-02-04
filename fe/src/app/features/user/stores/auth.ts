'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { UserData } from '../dtos/data';

interface AuthState {
  id?: string;
  nickname?: string;
  profileImage?: string;
  sessionRestored: boolean;
}

interface AuthActions {
  setUser: (user: UserData) => void;
  resetUser: () => void;
  setSessionRestored: (value: boolean) => void;
}

export type AuthStore = AuthState & AuthActions;

export const authStore = create<AuthStore>()(
  persist(
    (set) => ({
      id: undefined,
      nickname: undefined,
      profileImage: undefined,
      sessionRestored: false,

      setUser: (user) =>
        set(() => ({
          id: user.id,
          nickname: user.nickname,
          profileImage: user.profileImage,
        })),

      resetUser: () =>
        set(() => ({
          id: undefined,
          nickname: undefined,
          profileImage: undefined,
          sessionRestored: false,
        })),

      setSessionRestored: (value) => set(() => ({ sessionRestored: value })),
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        id: state.id,
        nickname: state.nickname,
        profileImage: state.profileImage,
      }),
    },
  ),
);
