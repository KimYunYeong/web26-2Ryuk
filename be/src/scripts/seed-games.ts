import { DataSource } from 'typeorm';
import { Game, GameType } from '@src/modules/game/game.entity';
import databaseConfig from '@src/providers/database/database.config';
import { randomUUID } from 'crypto';

/*
게임 데이터 시드 스크립트

로컬 환경에서 실행
- cd be
- pnpm seed:games

도커 컨테이너 내부에서 실행
- docker exec eryuk-server pnpm seed:games:docker
*/

const mockGames = [
  {
    id: randomUUID(),
    title: '비커 채우기',
    description: '제한 시간 동안 스페이스바를 빠르게 연타하여 비커를 채우세요!',
    type: GameType.COMPETITION,
    min_participants: 1,
    max_participants: 10,
  },
  {
    id: randomUUID(),
    title: '반응 속도 테스트',
    description: '화면에 나타나는 신호에 최대한 빨리 반응하세요!',
    type: GameType.COMPETITION,
    min_participants: 2,
    max_participants: 6,
  },
];

/**
 * 게임 데이터 시드 스크립트
 */
async function seedGames() {
  const dataSource = new DataSource(databaseConfig);

  try {
    await dataSource.initialize();
    console.log('데이터베이스 연결 성공');

    const gameRepository = dataSource.getRepository(Game);

    // 기존 게임 확인
    const existingGames = await gameRepository.count();
    if (existingGames > 0) {
      console.log(`⚠️  기존 게임 ${existingGames}개가 있습니다.`);
      console.log('기존 데이터를 모두 삭제하고 새로 삽입합니다...');
      // 기존 데이터 삭제
      await gameRepository.clear();
      console.log('기존 데이터 삭제 완료');
    }

    console.log(`총 ${mockGames.length}개의 게임을 삽입합니다...`);

    // 게임 데이터 변환 및 삽입
    const gamesToInsert = mockGames.map((mockGame) => {
      const game = new Game();
      game.id = mockGame.id;
      game.title = mockGame.title;
      game.description = mockGame.description;
      game.type = mockGame.type;
      game.min_participants = mockGame.min_participants;
      game.max_participants = mockGame.max_participants;

      return game;
    });

    // 배치 삽입 (성능 향상)
    await gameRepository.save(gamesToInsert);

    console.log(`✅ ${mockGames.length}개의 게임이 성공적으로 삽입되었습니다.`);
    console.log('\n삽입된 게임 목록:');
    mockGames.forEach((game, index) => {
      console.log(`${index + 1}. ${game.title} (ID: ${game.id})`);
      console.log(`   - 타입: ${game.type}`);
      console.log(`   - 참가 인원: ${game.min_participants} ~ ${game.max_participants}명`);
      console.log(`   - 설명: ${game.description}\n`);
    });
  } catch (error) {
    console.error('❌ 게임 시드 중 오류 발생:', error);
    throw error;
  } finally {
    await dataSource.destroy();
    console.log('데이터베이스 연결 종료');
  }
}

// 스크립트 실행
seedGames()
  .then(() => {
    console.log('시드 완료');
    process.exit(0);
  })
  .catch((error) => {
    console.error('시드 실패:', error);
    process.exit(1);
  });
