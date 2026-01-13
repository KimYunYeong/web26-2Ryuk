import { Controller, Get, HttpException, HttpStatus } from '@nestjs/common';
import { RoomService } from './room.service';
import { RoomListResponseDto } from './dto/room.dto';
import { ApiResponseMessage } from '@src/common/decorators/api-response-message.decorator';

@Controller('rooms')
export class RoomController {
  constructor(private readonly roomService: RoomService) {}

  //로컬 방 목록 조회 -> GET /api/rooms/all
  @Get('all')
  @ApiResponseMessage('방 목록 조회에 성공 했습니다.')
  async getLocalRooms(): Promise<RoomListResponseDto> {
    try {
      const rooms = await this.roomService.getLocalRooms();
      return { rooms };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
