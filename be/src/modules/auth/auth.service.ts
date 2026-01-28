import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../user/user.entity';
import { toUuid } from '@src/common/utils/user-id';
import { UserInfoResponseDto, UserWithRoleResponseDto } from './dto/auth-response.dto';
import { JwtService } from '@nestjs/jwt';

interface OAuthUser {
  githubId: string;
  email?: string;
  nickname?: string;
  profileImage?: string;
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    private readonly jwtService: JwtService,
  ) {}

  async validateOAuthUser(profile: OAuthUser): Promise<User> {
    const { githubId, email, nickname, profileImage } = profile;

    let user = await this.userRepository.findOne({ where: { github_id: githubId } });

    if (user) {
      return user;
    }

    user = await this.userRepository.findOne({ where: { email } });

    if (user) {
      // 기존 이메일 사용자가 GitHub 연동을 시도하는 경우
      user.github_id = githubId;
      return this.userRepository.save(user);
    }

    // 신규 사용자 생성
    const newUser = this.userRepository.create({
      email,
      github_id: githubId,
      nickname: nickname || `user-${githubId.substring(0, 4)}`, // TODO: 닉네임 중복 처리 필요
      profile_image: profileImage || null,
    });

    return this.userRepository.save(newUser);
  }

  async login(user: User) {
    const payload = { sub: user.id, email: user.email };
    return {
      accessToken: this.jwtService.sign(payload),
    };
  }

  /**
   * userId로 사용자 정보 조회
   * @param userId 원본 ID('J001') 또는 UUID 형식
   * @returns 사용자 정보 (id, nickname, profile_image)
   * @throws NotFoundException 사용자를 찾을 수 없는 경우
   */
  async getUserById(userId: string): Promise<UserInfoResponseDto> {
    const uuid = toUuid(userId);
    const user = await this.userRepository.findOne({
      where: { id: uuid },
      select: ['id', 'nickname', 'profile_image'],
    });

    if (!user) {
      throw new NotFoundException('사용자를 찾을 수 없습니다.');
    }

    return new UserInfoResponseDto(user);
  }

  /**
   * userId로 사용자 정보 조회 (role 포함)
   * 채팅 등에서 사용자 정보와 role이 모두 필요한 경우 사용
   * @param userId 원본 ID('J001') 또는 UUID 형식
   * @returns 사용자 정보 (id, nickname, profile_image, role)
   * @throws NotFoundException 사용자를 찾을 수 없는 경우
   */
  async getUserWithRole(userId: string): Promise<UserWithRoleResponseDto> {
    const uuid = toUuid(userId);
    const user = await this.userRepository.findOne({
      where: { id: uuid },
      select: ['id', 'nickname', 'profile_image', 'role'],
    });

    if (!user) {
      throw new NotFoundException('사용자를 찾을 수 없습니다.');
    }

    return new UserWithRoleResponseDto(user);
  }
}
