import '@/mocks/server';
import RoomChatPanel from './RoomChatPanel';
import { roomChatService } from '../services/RoomChatService';
import roomService from '@/app/features/room/services/RoomService';
import { RoomConverter } from '@/app/features/room/dtos/Room';

interface RoomChatPanelServerProps {
  roomId: string;
  myUserId: string;
}

export default async function RoomChatPanelServer({ roomId, myUserId }: RoomChatPanelServerProps) {
  // TODO: 웹소켓 연결로 대체
  const [roomDto, chats] = await Promise.all([
    roomService.getRoom(roomId),
    roomChatService.getChats(roomId),
  ]);

  const roomData = RoomConverter.toData(roomDto);

  return <RoomChatPanel participantCount={roomData.currentParticipants} chats={chats} />;
}
