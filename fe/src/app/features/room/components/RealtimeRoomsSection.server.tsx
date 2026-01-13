import { RoomConverter } from '@/app/features/room/dtos/Room';
import RealtimeRoomsSection from './RealtimeRoomsSection';
import roomService from '@/app/features/room/services/RoomService';

export default async function RealtimeRoomsSectionServer() {
  const roomsDto = await roomService.getRooms();
  const roomsData = roomsDto.rooms.map(RoomConverter.toData);
  return <RealtimeRoomsSection rooms={roomsData} />;
}
