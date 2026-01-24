import roomService from '@/app/features/room/services/RoomService';
import { roomStore } from '@/app/features/room/stores/room';
import { roomChatService } from '@/app/features/chat/services/RoomChatService';

export async function leaveRoom() {
  roomStore.getState().leaveRoom();
  await roomChatService.unsubscribe();
}

export async function deleteRoom(roomId: string) {
  await roomService.deleteRoom(roomId);
  roomStore.getState().leaveRoom();
}
