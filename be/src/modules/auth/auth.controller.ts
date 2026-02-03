import { Controller, Post, Get, Body, UseGuards, Req, Res } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { MockAuthService } from './mock-auth.service';
import { GetMeResponseDto } from './dto/auth-response.dto';
import { MockLoginDto, MockUserResponseDto } from './dto/mock-login.dto';
import { Response } from 'express';
import { JwtAuthGuard } from './jwt-auth.guard';
import { BypassTransform } from '@src/common/decorators/bypass-transform.decorator';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly mockAuthService: MockAuthService,
  ) {}

  // GitHub OAuth 로그인 라우트
  @Get('github')
  @UseGuards(AuthGuard('github'))
  async githubAuth() {
    // Guard redirects
  }

  // GithHub OAuth 콜백 라우트
  @Get('github/callback')
  @UseGuards(AuthGuard('github'))
  @BypassTransform()
  async githubAuthCallback(@Req() req, @Res({ passthrough: true }) res: Response) {
    await this.authService.handleOAuthLogin(req.user, res);
  }

  // Google OAuth 로그인 라우트
  @Get('google')
  @UseGuards(AuthGuard('google'))
  async googleAuth() {
    // Guard redirects
  }

  // Google OAuth 콜백 라우트
  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  @BypassTransform()
  async googleAuthCallback(@Req() req, @Res({ passthrough: true }) res: Response) {
    await this.authService.handleOAuthLogin(req.user, res);
  }

  /**
   * 개발용 Mock 로그인 (토큰 발급)
   * POST /api/auth/mock/login
   */
  @Post('mock/login')
  async mockLogin(@Body() dto: MockLoginDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.handleMockLogin(dto, res);
    if (!result.success) {
      return { success: false, message: '존재하지 않는 Mock 사용자입니다.' };
    }
    return {
      success: true,
      userId: result.userId,
      user: result.user,
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
  @UseGuards(JwtAuthGuard)
  async getMe(@Req() req) {
    // JwtAuthGuard가 토큰을 검증하고 user 객체를 req에 주입
    // JwtStrategy의 validate 메소드에서 반환된 값이 req.user에 담김
    const user = await this.authService.getUserById(req.user.id);
    return new GetMeResponseDto(user);
  }

  /**
   * 로그아웃 (쿠키 삭제)
   * POST /api/auth/logout
   */
  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @BypassTransform()
  async logout(@Res({ passthrough: true }) res: Response) {
    res.cookie('accessToken', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      expires: new Date(0), // 즉시 만료
    });
    return { success: true, message: '로그아웃 되었습니다.' };
  }
}
