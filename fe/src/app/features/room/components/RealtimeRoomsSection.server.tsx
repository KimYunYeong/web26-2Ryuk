import RealtimeRoomsSection from './RealtimeRoomsSection';
import { RoomConverter } from '../dtos/Room';
import { RoomDto } from '../dtos/type';
import roomsMock from '@/mocks/data/rooms.json';

/**
 * 서버 컴포넌트에서 직접 mock 데이터 사용
 * MSW 초기화 타이밍 문제를 피하기 위해 서버 컴포넌트에서는 직접 mock 데이터를 사용
 */
export default async function RealtimeRoomsSectionServer() {
  const roomDtos = roomsMock.rooms as RoomDto[];
  const convertedRooms = roomDtos.map(RoomConverter.toData);

  return <RealtimeRoomsSection rooms={convertedRooms} />;
}
