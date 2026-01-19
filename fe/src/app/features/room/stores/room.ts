'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { RoomData, ParticipantData } from '@/app/features/room/dtos/type';

interface RoomState {
  roomId: string | null;
  isJoined: boolean;
  roomData: RoomData<ParticipantData> | null;
}

interface RoomActions {
  setRoom: (roomId: string | null) => void;
  setRoomData: (roomData: RoomData<ParticipantData> | null) => void;
  updateRoomData: (updates: Partial<RoomData<ParticipantData>>) => void;
  addParticipant: (participant: ParticipantData) => void;
  removeParticipant: (userId: string) => void;
  setJoined: (isJoined: boolean) => void;
  leaveRoom: () => void;
}

export type RoomStore = RoomState & RoomActions;

export const roomStore = create<RoomStore>()(
  persist(
    (set) => ({
      roomId: null,
      isJoined: false,
      roomData: null,

      setRoom: (roomId: string | null) =>
        set((state) => {
          const roomData = state.roomData?.id === roomId ? state.roomData : null;
          return { roomId, isJoined: false, roomData };
        }),

      setRoomData: (roomData: RoomData<ParticipantData> | null) => {
        const roomId = roomData?.id || null;
        set({ roomData, roomId });
      },

      updateRoomData: (updates: Partial<RoomData<ParticipantData>>) =>
        set((state) => {
          const next: Partial<RoomState> = {};
          if (state.roomData) next.roomData = { ...state.roomData, ...updates };
          else if (updates.currentParticipants != null && state.roomId) {
            next.roomData = {
              id: state.roomId,
              currentParticipants: updates.currentParticipants,
              participants: [],
              createDate: updates.createDate ?? new Date(),
            };
          }
          return next;
        }),

      addParticipant: (participant: ParticipantData) =>
        set((state) => {
          if (!state.roomData) return state;
          const exists = state.roomData.participants.some((p) => p.userId === participant.userId);
          const participants = [...state.roomData.participants, participant];
          if (exists) return state;
          return { roomData: { ...state.roomData, participants } };
        }),

      removeParticipant: (userId: string) =>
        set((state) => {
          if (!state.roomData) return state;
          const participants = state.roomData.participants.filter((p) => p.userId !== userId);
          return { roomData: { ...state.roomData, participants } };
        }),

      setJoined: (isJoined: boolean) => set({ isJoined }),

      leaveRoom: () => set({ roomId: null, isJoined: false, roomData: null }),
    }),
    {
      name: 'room-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ roomId: state.roomId, isJoined: state.isJoined }),
    },
  ),
);
