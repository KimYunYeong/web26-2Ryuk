import { HttpService } from '@/app/services/http.service';
import { RoomDto, RoomEditDto, RoomsListDto } from '@/app/features/room/dtos/type';
import { authStore } from '@/app/features/user/stores/auth';
import { ApiResponse, IdDto } from './type';

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

  async createRoom(data: RoomEditDto): Promise<RoomDto> {
    const token = authStore.getState().token || undefined;
    const response = await HttpService.post<ApiResponse<RoomDto>>('/api/rooms', data, token);
    if (!response.success || !response.data) {
      throw new Error(response.message || '방 생성에 실패했습니다.');
    }
    return response.data;
  }

  async updateRoom(roomId: string, data: RoomEditDto): Promise<RoomDto> {
    const token = authStore.getState().token || undefined;
    const response = await HttpService.put<ApiResponse<RoomDto>>(
      `/api/rooms/${roomId}`,
      data,
      token,
    );
    if (!response.success || !response.data) {
      throw new Error(response.message || '방 수정에 실패했습니다.');
    }
    return response.data;
  }

  async deleteRoom(roomId: string): Promise<void> {
    const token = authStore.getState().token || undefined;
    const response = await HttpService.delete<ApiResponse<IdDto>>(`/api/rooms/${roomId}`, token);
    if (!response.success) {
      throw new Error(response.message || '방 삭제에 실패했습니다.');
    }
  }
}

const roomService = new RoomService();
export default roomService;
