import {
  Body,
  Controller,
  Delete,
  Headers,
  Param,
  Get,
  Patch,
  Post,
  HttpException,
  UnauthorizedException,
  HttpStatus,
  Query,
  UsePipes,
  ValidationPipe,
  Logger,
} from '@nestjs/common';
import { MockAuthService } from '@src/modules/auth/mock-auth.service';
import { RoomRequestDto, RoomResponseDto, RoomDeleteResponseDto, JoinRoomRequestDto } from './dto/room.dto';
import { RoomService } from './room.service';
import { RoomListResponseDto, RoomSearchQueryDto } from './dto/room.dto';
import { ApiResponseMessage } from '@src/common/decorators/api-response-message.decorator';
import { LOG, logMessage } from '@src/common/utils/log-messages';

@Controller('rooms')
export class RoomController {
  private readonly logger = new Logger(RoomController.name);

  constructor(
    private readonly roomService: RoomService,
    private readonly authService: MockAuthService,
  ) {}

  @Post()
  @ApiResponseMessage('대화방이 성공적으로 생성되었습니다.')
  async createRoom(
    @Headers('authorization') authHeader: string,
    @Body() dto: RoomRequestDto,
  ): Promise<RoomResponseDto> {
    if (!authHeader) throw new UnauthorizedException('인증이 필요합니다.');

    const token = authHeader.replace('Bearer ', '');
    const payload = this.authService.verifyMockToken(token);

    if (!payload) throw new UnauthorizedException('유효하지 않은 토큰입니다.');

    const userId = payload.userId;

    return await this.roomService.createRoom(userId, dto);
  }

  @Patch(':roomId')
  @ApiResponseMessage('대화방이 성공적으로 수정되었습니다.')
  async updateRoom(
    @Headers('authorization') authHeader: string,
    @Param('roomId') roomId: string,
    @Body() dto: RoomRequestDto,
  ): Promise<RoomResponseDto> {
    if (!authHeader) throw new UnauthorizedException('인증이 필요합니다.');

    const token = authHeader.replace('Bearer ', '');
    const payload = this.authService.verifyMockToken(token);

    if (!payload) throw new UnauthorizedException('유효하지 않은 토큰입니다.');

    const userId = payload.userId;

    return await this.roomService.updateRoom(userId, roomId, dto);
  }

  @Delete(':roomId')
  @ApiResponseMessage('대화방이 성공적으로 삭제되었습니다.')
  async deleteRoom(
    @Headers('authorization') authHeader: string,
    @Param('roomId') roomId: string,
  ): Promise<RoomDeleteResponseDto> {
    if (!authHeader) throw new UnauthorizedException('인증이 필요합니다.');

    const token = authHeader.replace('Bearer ', '');
    const payload = this.authService.verifyMockToken(token);

    if (!payload) throw new UnauthorizedException('유효하지 않은 토큰입니다.');

    const userId = payload.userId;

    return await this.roomService.deleteRoom(userId, roomId);
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

  /**
   * 방 입장 가능 여부 검증
   */
  @Post(':id/join')
  @ApiResponseMessage('입장 가능한 방입니다.')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async validateJoin(
    @Param('id') roomId: string,
    @Body() dto: JoinRoomRequestDto,
    @Headers('authorization') authHeader?: string,
  ): Promise<void> {
    if (!authHeader) {
      logMessage(this.logger, LOG.ROOM.UNAUTH_API_ACCESS_JOIN(roomId));
      throw new UnauthorizedException('인증이 필요합니다.');
    }

    const token = authHeader.replace('Bearer ', '');
    const payload = this.authService.verifyMockToken(token);

    if (!payload) {
      logMessage(this.logger, LOG.ROOM.INVALID_TOKEN_API_JOIN(roomId));
      throw new UnauthorizedException('유효하지 않은 토큰입니다.');
    }

    await this.roomService.validateJoinRoom(roomId, payload.userId, dto.password);
  }
}
