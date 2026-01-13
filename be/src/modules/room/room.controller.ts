import { Body, Controller, Delete, Headers, Param, Get, Patch, Post, HttpException, UnauthorizedException, HttpStatus, Query } from '@nestjs/common';
import { HttpResponseDto } from '@src/common/dtos/http-response.dto';
import { MockAuthService } from '@src/modules/auth/mock-auth.service';
import { RoomRequestDto, RoomResponseDto, RoomDeleteResponseDto } from './dto/room.dto';
import { RoomService } from './room.service';
import { RoomListResponseDto, RoomSearchQueryDto } from './dto/room.dto';
import { ApiResponseMessage } from '@src/common/decorators/api-response-message.decorator';

@Controller('rooms')
export class RoomController {
  constructor(
    private readonly roomService: RoomService,
    private readonly authService: MockAuthService,
  ) {}

  @Post()
  async createRoom(
    @Headers('authorization') authHeader: string,
    @Body() dto: RoomRequestDto,
  ): Promise<HttpResponseDto<RoomResponseDto>> {
    const token = authHeader.replace('Bearer ', '');
    const payload = this.authService.verifyMockToken(token);
    if (!payload) {
      throw new UnauthorizedException('인증이 필요합니다.');
    }

    const userId = payload.userId;
    const data = await this.roomService.createRoom(userId, dto);

    return new HttpResponseDto<RoomResponseDto>(true, '대화방이 성공적으로 생성되었습니다.', data);
  }

  @Patch(':roomId')
  async updateRoom(
    @Headers('authorization') authHeader: string,
    @Param('roomId') roomId: string,
    @Body() dto: RoomRequestDto,
  ): Promise<HttpResponseDto<RoomResponseDto>> {
    const token = authHeader.replace('Bearer ', '');
    const payload = this.authService.verifyMockToken(token);
    if (!payload) {
      throw new UnauthorizedException('인증이 필요합니다.');
    }
    const userId = payload.userId;
    const data = await this.roomService.updateRoom(userId, roomId, dto);

    return new HttpResponseDto<RoomResponseDto>(true, '대화방이 성공적으로 수정되었습니다.', data);
  }

  @Delete(':roomId')
  async deleteRoom(
    @Headers('authorization') authHeader: string,
    @Param('roomId') roomId: string,
  ): Promise<HttpResponseDto<RoomDeleteResponseDto>> {
    const token = authHeader.replace('Bearer ', '');
    const payload = this.authService.verifyMockToken(token);
    if (!payload) {
      throw new UnauthorizedException('인증이 필요합니다.');
    }
    const userId = payload.userId;
    const data = await this.roomService.deleteRoom(userId, roomId);

    return new HttpResponseDto<RoomDeleteResponseDto>(true, '대화방이 성공적으로 삭제되었습니다.', data);
  }

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

  // postman 에러 테스트용 -> GET /api/rooms/test/error
  @Get('test/error')
  async testError(): Promise<void> {
    throw new HttpException('서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.', HttpStatus.INTERNAL_SERVER_ERROR);
  }
}
