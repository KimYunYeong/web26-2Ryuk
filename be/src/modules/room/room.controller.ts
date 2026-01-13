import { Controller, Get, Query } from '@nestjs/common';
import { RoomService } from './room.service';
import { RoomListResponseDto, RoomSearchQueryDto } from './dto/room.dto';
import { ApiResponseMessage } from '@src/common/decorators/api-response-message.decorator';

@Controller('rooms')
export class RoomController {
  constructor(private readonly roomService: RoomService) {}

  //로컬 방 목록 조회 -> GET /api/rooms/all
  @Get('all')
  @ApiResponseMessage('방 목록 조회에 성공 했습니다.')
  async getLocalRooms(): Promise<RoomListResponseDto> {
    const rooms = await this.roomService.getLocalRooms();
    return { rooms };
  }

  //로컬 방 검색 -> GET /api/rooms/search?keyword=검색어
  @Get('search')
  @ApiResponseMessage('방 검색 조회에 성공 했습니다.')
  async searchLocalRooms(@Query() query: RoomSearchQueryDto): Promise<RoomListResponseDto> {
    const keyword = query.keyword || '';
    const rooms = await this.roomService.searchLocalRooms(keyword);
    return { rooms };
  }
}
