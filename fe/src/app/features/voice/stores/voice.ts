import { create } from 'zustand';

// UI 렌더링에 필요한 확장된 유저 상태 타입
export type UserVoiceState = {
  stream?: MediaStream;
  isMicOn: boolean;
  isSpeakerOn: boolean;
  volume: number;
};

interface VoiceState {
  voiceUsers: Record<string, UserVoiceState>;
  isMyMicOn: boolean;

  // Actions
  setVoiceUser: (userId: string, data: Partial<UserVoiceState>) => void;
  removeVoiceUser: (userId: string) => void;
  setMyMic: (on: boolean) => void;
}

export const useVoiceStore = create<VoiceState>((set) => ({
  voiceUsers: {},
  isMyMicOn: true,

  setVoiceUser: (userId, data) =>
    set((state) => {
      // 해당 유저의 기존 정보가 없으면 기본값을 생성합니다.
      const initialUser: UserVoiceState = {
        isMicOn: false,
        isSpeakerOn: true,
        volume: 50,
        stream: undefined,
      };

      const currentUser = state.voiceUsers[userId] || initialUser;

      return {
        voiceUsers: {
          ...state.voiceUsers,
          [userId]: { ...currentUser, ...data },
        },
      };
    }),

  removeVoiceUser: (userId) =>
    set((state) => {
      const next = { ...state.voiceUsers };
      delete next[userId];
      return { voiceUsers: next };
    }),

  setMyMic: (on) => set({ isMyMicOn: on }),
}));
