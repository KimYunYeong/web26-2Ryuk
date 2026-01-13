import { Body, Controller, Delete, Headers, Param, Patch, Post, UnauthorizedException } from '@nestjs/common';
import { HttpResponseDto } from '@src/common/dtos/http-response.dto';
import { MockAuthService } from '@src/modules/auth/mock-auth.service';
import { RoomRequestDto, RoomResponseDto, RoomDeleteResponseDto } from './dto/room.dto';
import { RoomService } from './room.service';

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
}
