'use client';

import { globalChatService } from '@/app/features/chat/services/GlobalChatService';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { User, UserService } from '../services/UserService';

/* ================== Types ================== */

interface AuthState {
  isAuthenticated: boolean;
  userId?: string;
  token?: string;
  user?: User;
  hasHydrated: boolean;
}

interface AuthActions {
  initialize: () => Promise<void>;
  login: (userId: string) => Promise<void>;
  logout: () => void;
}

export type AuthStore = AuthState & AuthActions;

/* ================== Store ================== */

export const authStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      /* ---------- state ---------- */
      isAuthenticated: false,
      userId: undefined,
      token: undefined,
      user: undefined,
      hasHydrated: false,

      /* ---------- initialize ---------- */
      initialize: async () => {
        const { hasHydrated, token, userId } = get();
        if (!hasHydrated) return;

        if (!token || !userId) {
          set({
            isAuthenticated: false,
            userId: undefined,
            user: undefined,
          });
          return;
        }

        try {
          const data = await UserService.mockLogin(userId);

          const user: User = {
            id: data.user.id,
            nickname: data.user.nickname,
            profileImage: data.user.profile_image ?? undefined,
          };

          set({
            isAuthenticated: true,
            userId: data.userId,
            token: data.token,
            user,
          });

          // WebSocket 구독
          if (typeof window !== 'undefined') {
            await globalChatService.subscribe();
          }
        } catch (e) {
          console.warn('[Auth] initialize failed', e);
          set({ isAuthenticated: false, user: undefined });
        }
      },

      /* ---------- login ---------- */
      login: async (userId: string) => {
        const data = await UserService.mockLogin(userId);

        const user: User = {
          id: data.user.id,
          nickname: data.user.nickname,
          profileImage: data.user.profile_image ?? undefined,
        };

        set({
          isAuthenticated: true,
          userId: data.userId,
          token: data.token,
          user,
        });

        if (typeof window === 'undefined') return;
        const { globalChatService } =
          await import('@/app/features/chat/services/GlobalChatService');
        await globalChatService.subscribe();
        // 로그인 시 글로벌 채팅 참가자 수 낙관적 +1
        globalChatService.incrementParticipantsOptimistic();
      },

      /* ---------- logout ---------- */
      logout: () => {
        set({
          isAuthenticated: false,
          userId: undefined,
          token: undefined,
          user: undefined,
        });

        if (typeof window === 'undefined') return;
        // 로그아웃 시 글로벌 채팅 참가자 수 낙관적 -1
        globalChatService.decrementParticipantsOptimistic();
        globalChatService.notifyLogout();
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),

      partialize: (state) => ({
        token: state.token,
        userId: state.userId,
        isAuthenticated: state.isAuthenticated,
      }),

      onRehydrateStorage: () => (state) => {
        if (!state) return;

        // hydrate 완료 표시
        state.hasHydrated = true;

        // multi-tab sync
        const onStorage = async (e: StorageEvent) => {
          if (e.key !== 'auth-storage') return;

          const parsed = e.newValue ? JSON.parse(e.newValue) : null;
          const next = parsed?.state;

          if (!next?.token) return authStore.getState().logout();

          if (next.token !== authStore.getState().token) {
            authStore.setState({
              token: next.token,
              userId: next.userId,
              isAuthenticated: true,
            });

            try {
              const user = await UserService.getMe(next.token);
              authStore.setState({ user });
            } catch {
              authStore.getState().logout();
            }
          }
        };

        if (typeof window !== 'undefined') {
          window.addEventListener('storage', onStorage);
        }
      },
    },
  ),
);
