import { Body, Controller, Headers, Post, UnauthorizedException } from '@nestjs/common';
import { HttpResponseDto } from '@src/common/dtos/http-response.dto';
import { MockAuthService } from '@src/modules/auth/mock-auth.service';
import { RoomCreateRequestDto, RoomResponseDto } from './dto/room.dto';
import { RoomService } from './room.service';

@Controller('rooms')
export class RoomController {
  constructor(
    private readonly roomService: RoomService,
    private readonly authService: MockAuthService,
  ) {}

  @Post()
  async createRoom(
    @Headers('authorization') token: string,
    @Body() dto: RoomCreateRequestDto,
  ): Promise<HttpResponseDto<RoomResponseDto>> {
    const validate = this.authService.verifyMockToken(token);
    console.log('validate', validate, token);
    if (!validate) {
      throw new UnauthorizedException('인증이 필요합니다.');
    }
    const userId = validate.userId;
    const data = await this.roomService.createRoom(userId, dto);

    return new HttpResponseDto<RoomResponseDto>(true, '대화방이 성공적으로 생성되었습니다.', data);
  }
}
