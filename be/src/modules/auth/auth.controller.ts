import { Controller, Post, Get, Body, UseGuards, Req, Res, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { MockAuthService } from './mock-auth.service';
import { GetMeResponseDto, RefreshTokenResponseDto } from './dto/auth-response.dto';
import { MockLoginDto, MockUserResponseDto } from './dto/mock-login.dto';
import { toUuid } from '@src/common/utils/user-id';
import type { CookieOptions, Request, Response } from 'express';
import { JwtAuthGuard } from './jwt-auth.guard';
import { BypassTransform } from '@src/common/decorators/bypass-transform.decorator';
import { ConfigService } from '@nestjs/config';
import { JwtRefreshGuard } from './jwt-refresh.guard';

const parseDurationToMs = (value: string): number => {
  const match = value.match(/^(\d+)(ms|s|m|h|d)$/);
  if (!match) {
    const parsed = Number(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }

  const amount = Number(match[1]);
  const unit = match[2];

  switch (unit) {
    case 'ms':
      return amount;
    case 's':
      return amount * 1000;
    case 'm':
      return amount * 60 * 1000;
    case 'h':
      return amount * 60 * 60 * 1000;
    case 'd':
      return amount * 24 * 60 * 60 * 1000;
    default:
      return amount;
  }
};

const buildRefreshCookieOptions = (configService: ConfigService): CookieOptions => {
  const expiresIn = configService.get<string>('JWT_REFRESH_EXPIRES_IN', '30d');
  const isProd = configService.get<string>('NODE_ENV') === 'production';
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    path: '/api',
    maxAge: parseDurationToMs(expiresIn),
  };
};

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly mockAuthService: MockAuthService,
    private readonly configService: ConfigService,
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
  async githubAuthCallback(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const oauthUser = req.user;
    if (!oauthUser?.email) {
      throw new UnauthorizedException();
    }
    const { refreshToken } = await this.authService.login({
      id: oauthUser.id,
      email: oauthUser.email,
    });
    res.cookie('refreshToken', refreshToken, buildRefreshCookieOptions(this.configService));

    res.redirect(`${process.env.FRONTEND_URL}/auth/callback`);
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
  async googleAuthCallback(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const oauthUser = req.user;
    if (!oauthUser?.email) throw new UnauthorizedException();

    const { refreshToken } = await this.authService.login({
      id: oauthUser.id,
      email: oauthUser.email,
    });
    res.cookie('refreshToken', refreshToken, buildRefreshCookieOptions(this.configService));

    res.redirect(`${process.env.FRONTEND_URL}/auth/callback`);
  }

  /**
   * 개발용 Mock 로그인 (토큰 발급)
   * POST /api/auth/mock/login
   */
  @Post('mock/login')
  async mockLogin(@Body() dto: MockLoginDto, @Res({ passthrough: true }) res: Response) {
    // Mock 사용자 확인
    // MockAuthService에서 User 엔티티와 유사한 형태로 Mock 사용자 정보를 가져옴
    const mockUser = this.mockAuthService.getMockUserById(dto.userId);
    if (!mockUser) {
      return { success: false, message: '존재하지 않는 Mock 사용자입니다.', data: null };
    }

    // Mock 사용자를 실제 User 엔티티 타입으로 변환 (필요한 속성만 매핑)
    const tokenPayload = {
      id: toUuid(mockUser.id),
      email: mockUser.email,
    };

    // 실제 AuthService의 login 메소드를 사용하여 JWT 발급
    const tokens = await this.authService.login(tokenPayload);
    res.cookie('refreshToken', tokens.refreshToken, buildRefreshCookieOptions(this.configService));

    // UUID 변환 (이미 user.id에서 변환됨)
    const uuid = tokenPayload.id;

    return {
      access_token: tokens.accessToken,
      user: {
        id: uuid,
        nickname: mockUser.nickname,
        profile_image: mockUser.profile_image ?? undefined,
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
  @UseGuards(JwtAuthGuard)
  async getMe(@Req() req: Request) {
    const userId = req.user?.id;
    if (!userId) {
      throw new UnauthorizedException();
    }
    // JwtAuthGuard가 토큰을 검증하고 user 객체를 req에 주입
    // JwtStrategy의 validate 메소드에서 반환된 값이 req.user에 담김
    const user = await this.authService.getUserById(userId);
    return new GetMeResponseDto(user);
  }

  @Post('refresh')
  @UseGuards(JwtRefreshGuard)
  async refresh(@Req() req: Request) {
    const userId = req.user?.id;
    if (!userId) throw new UnauthorizedException();

    const user = await this.authService.findUserEntityById(userId);
    const accessToken = this.authService.issueAccessToken(user);
    return new RefreshTokenResponseDto(accessToken);
  }

  /**
   * 로그아웃 (쿠키 삭제)
   * POST /api/auth/logout
   */
  @Post('logout')
  @BypassTransform()
  async logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('refreshToken', {
      ...buildRefreshCookieOptions(this.configService),
      maxAge: 0,
      expires: new Date(0),
    });
    return { success: true, message: '로그아웃 되었습니다.' };
  }
}
