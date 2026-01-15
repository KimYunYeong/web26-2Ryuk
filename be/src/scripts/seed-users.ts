import { DataSource } from 'typeorm';
import { User } from '@src/modules/user/user.entity';
import databaseConfig from '@src/providers/database/database.config';
import mockUsers from '@src/mocks/users.js';
import { createHash } from 'crypto';

/**
 * 문자열을 UUID 형식으로 변환
 * 'J001' 같은 문자열을 일관된 UUID 문자열로 변환
 * UUID transformer는 하이픈이 없는 hex 문자열을 받아서 BINARY(16)으로 변환
 */
function stringToUuid(str: string): string {
  // 문자열을 MD5 해시하여 UUID 형식으로 변환
  const hash = createHash('md5').update(str).digest('hex');
  // UUID 형식으로 포맷팅 (8-4-4-4-12)
  const uuid = `${hash.substring(0, 8)}-${hash.substring(8, 12)}-${hash.substring(12, 16)}-${hash.substring(16, 20)}-${hash.substring(20, 32)}`;
  return uuid;
}

/**
 * 사용자 데이터 시드 스크립트
 */
async function seedUsers() {
  const dataSource = new DataSource(databaseConfig);

  try {
    await dataSource.initialize();
    console.log('데이터베이스 연결 성공');

    const userRepository = dataSource.getRepository(User);

    // 기존 사용자 확인
    const existingUsers = await userRepository.count();
    if (existingUsers > 0) {
      console.log(`⚠️  기존 사용자 ${existingUsers}명이 있습니다.`);
      console.log('기존 데이터를 모두 삭제하고 새로 삽입합니다...');
      // 기존 데이터 삭제
      await userRepository.clear();
      console.log('기존 데이터 삭제 완료');
    }

    console.log(`총 ${mockUsers.length}명의 사용자를 삽입합니다...`);

    // 사용자 데이터 변환 및 삽입
    const usersToInsert = mockUsers.map((mockUser) => {
      const user = new User();
      user.id = stringToUuid(mockUser.id);
      user.email = mockUser.email;
      user.nickname = mockUser.nickname;
      user.profile_image = mockUser.profile_image;
      user.role = mockUser.role;
      user.is_blacklisted = mockUser.is_blacklisted;
      user.warning_count = mockUser.warning_count;
      user.create_date = new Date(mockUser.create_date);
      user.update_date = mockUser.update_date ? new Date(mockUser.update_date) : null;

      return user;
    });

    // 배치 삽입 (성능 향상)
    await userRepository.save(usersToInsert);

    console.log(`✅ ${mockUsers.length}명의 사용자가 성공적으로 삽입되었습니다.`);
  } catch (error) {
    console.error('❌ 사용자 시드 중 오류 발생:', error);
    throw error;
  } finally {
    await dataSource.destroy();
    console.log('데이터베이스 연결 종료');
  }
}

// 스크립트 실행
seedUsers()
  .then(() => {
    console.log('시드 완료');
    process.exit(0);
  })
  .catch((error) => {
    console.error('시드 실패:', error);
    process.exit(1);
  });
