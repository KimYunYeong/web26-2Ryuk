import { HttpService } from '@/app/services/http.service';
import { RoomDto, RoomCreationDto } from '@/app/features/room/dtos/type';
import { authStore } from '@/app/features/user/stores/auth';

interface RoomsApiResponse {
  success: boolean;
  message: string;
  data: {
    rooms: RoomDto[];
  };
}

interface RoomsResponse {
  rooms: RoomDto[];
}

interface RoomCreationResponse {
  success: boolean;
  message: string;
  data: {
    id: string;
    [key: string]: any;
  };
}

export class RoomService {
  async getRooms(): Promise<RoomsResponse> {
    const response = await HttpService.get<RoomsApiResponse>('/api/rooms/all');
    return { rooms: response.data.rooms };
  }

  async getRoom(roomId: string): Promise<RoomDto> {
    // TODO: 실제 API 엔드포인트로 교체
    interface RoomDetailResponse {
      success: boolean;
      message: string;
      data: RoomDto;
    }
    const response = await HttpService.get<RoomDetailResponse>(`/api/rooms/${roomId}`);
    console.log(response);
    return response.data;
  }

  async createRoom(data: RoomCreationDto): Promise<RoomCreationResponse> {
    const token = authStore.getState().token || undefined;
    const response = await HttpService.post<RoomCreationResponse>('/api/rooms', data, token);
    return response;
  }
}

const roomService = new RoomService();
export default roomService;
