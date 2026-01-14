import { Controller, Post, Get, Body, Headers, UsePipes, ValidationPipe } from '@nestjs/common';
import { MockAuthService } from './mock-auth.service';
import { MockLoginDto, MockUserResponseDto } from './dto/mock-login.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly mockAuthService: MockAuthService) {}

  /**
   * 개발용 Mock 로그인 (토큰 발급)
   * POST /api/auth/mock/login
   */
  @Post('mock/login')
  mockLogin(@Body() dto: MockLoginDto) {
    // Mock 사용자 확인
    const user = this.mockAuthService.getMockUserById(dto.userId);
    if (!user) return { success: false, message: '존재하지 않는 Mock 사용자입니다.' };

    // Mock 토큰 발급
    const token = this.mockAuthService.generateMockToken(dto.userId);

    return {
      success: true,
      token,
      userId: dto.userId,
      user: {
        id: user.id,
        email: user.email,
        nickname: user.nickname,
        profile_image: user.profile_image,
        role: user.role,
      },
    };
  }

  /**
   * 개발용 Mock 사용자 목록 반환
   * GET /api/auth/mock/users
   */
  @Get('mock/users')
  getMockUsers(): { users: MockUserResponseDto[] } {
    const users = this.mockAuthService.getMockUsers();
    return {
      users: users.map((user) => ({
        id: user.id,
        email: user.email,
        nickname: user.nickname,
        profile_image: user.profile_image,
        role: user.role,
      })),
    };
  }

  /**
   * 현재 인증된 사용자 정보 조회
   * GET /api/auth/me
   */
  @Get('me')
  getMe(@Headers('authorization') authHeader?: string) {
    if (!authHeader) return { success: false, message: '인증이 필요합니다.' };

    const token = authHeader.replace('Bearer ', '');
    const payload = this.mockAuthService.verifyMockToken(token);

    if (!payload) return { success: false, message: '유효하지 않은 토큰입니다.' };

    const user = this.mockAuthService.getMockUserById(payload.userId);
    if (!user) return { success: false, message: '사용자를 찾을 수 없습니다.' };

    return {
      id: user.id,
      nickname: user.nickname,
      avatar: user.profile_image || '',
    };
  }
}
