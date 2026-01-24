import roomService from '@/app/features/room/services/RoomService';
import { roomStore } from '@/app/features/room/stores/room';
import { roomChatService } from '@/app/features/chat/services/RoomChatService';

export async function cleanupRoomSession() {
  await roomChatService.unsubscribe();
  roomStore.getState().leaveRoom();
}

export async function leaveRoom() {
  await cleanupRoomSession();
}

export async function deleteRoom(roomId: string) {
  await roomService.deleteRoom(roomId);
  await cleanupRoomSession();
}
