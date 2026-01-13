import { HttpService } from '@/app/services/http.service';
import {
  RoomDto,
  RoomCreationDto,
  RoomsListData,
  RoomsListDto,
} from '@/app/features/room/dtos/type';
import { authStore } from '@/app/features/user/stores/auth';
import { ApiResponse } from './type';

export class RoomService {
  async getRooms(): Promise<RoomsListDto> {
    const response = await HttpService.get<ApiResponse<RoomsListDto>>('/api/rooms/all');
    if (!response.success || !response.data) {
      throw new Error(response.message || '방 목록 조회에 실패했습니다.');
    }
    return response.data;
  }

  async getRoom(roomId: string): Promise<RoomDto> {
    const response = await HttpService.get<ApiResponse<RoomDto>>(`/api/rooms/${roomId}`);
    if (!response.success || !response.data) {
      throw new Error(response.message || '방 조회에 실패했습니다.');
    }
    return response.data;
  }

  async createRoom(data: RoomCreationDto): Promise<ApiResponse<RoomDto>> {
    const token = authStore.getState().token || undefined;
    const response = await HttpService.post<ApiResponse<RoomDto>>('/api/rooms', data, token);
    return response;
  }
}

const roomService = new RoomService();
export default roomService;
