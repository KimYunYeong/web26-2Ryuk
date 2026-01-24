import roomService from '@/app/features/room/services/RoomService';
import { RoomConverter } from '@/app/features/room/dtos/converter';
import { RoomJoinInfoData } from '@/app/features/room/dtos/data';
import { roomStore } from '@/app/features/room/stores/room';
import { roomChatService } from '@/app/features/chat/services/RoomChatService';

/**
 * 인증 전: 방 입장 가능 여부 조회
 */
export async function fetchRoomJoinInfo(roomId: string): Promise<RoomJoinInfoData> {
  const dto = await roomService.getRoomJoinInfo(roomId);
  return RoomConverter.toRoomJoinInfoData(dto);
}

/**
 * 인증 후: 방 전체 정보 동기화
 */
export async function syncRoomState(roomId: string, userId?: string): Promise<boolean> {
  const dto = await roomService.getRoom(roomId);
  const room = RoomConverter.toData(dto);

  roomStore.getState().setRoomData(room);
  return room.hostId === userId;
}

/**
 * 방 세션 진입 (비밀번호 여부만 판단)
 */
export async function enterRoomSession(
  roomId: string,
  joinInfo: RoomJoinInfoData,
  userId?: string,
): Promise<{ needPassword: boolean; isHost: boolean }> {
  // 방 소속이 아닌 경우
  if (!joinInfo.isMember) {
    // 비밀번호 인증 필요
    if (joinInfo.isPrivate) return { needPassword: true, isHost: false };
    await roomService.validateJoin(roomId);
  }

  // 방장 여부
  const isHost = await syncRoomState(roomId, userId);

  // 방 채팅 구독
  await roomChatService.subscribe(roomId);

  return { needPassword: false, isHost };
}

/**
 * 비밀번호 인증 후 진입
 */
export async function enterRoomWithPassword(
  roomId: string,
  password: string,
  userId?: string,
): Promise<void> {
  await roomService.validateJoin(roomId, password);

  await syncRoomState(roomId, userId);
  await roomChatService.subscribe(roomId);
}
