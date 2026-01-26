import { DataSource } from 'typeorm';
import { CurseWord } from '@src/modules/curse-word/curse-word.entity';
import databaseConfig from '@src/providers/database/database.config';
import { Logger } from '@nestjs/common';

/**
 * 비속어 데이터 시드 스크립트
 *
 * 로컬 환경에서 실행:
 * - cd be
 * - pnpm seed:curse-words
 *
 * 기존 데이터가 있으면 교체합니다.
 */

const CURSE_WORDS = ['바보', '멍청이', '똥개', '말미잘'];

async function seedCurseWords() {
  const dataSource = new DataSource(databaseConfig);

  try {
    await dataSource.initialize();
    Logger.log('데이터베이스 연결 성공');

    const curseWordRepository = dataSource.getRepository(CurseWord);

    // 기존 비속어 확인
    const existingCount = await curseWordRepository.count();
    if (existingCount > 0) {
      Logger.log(`⚠️  기존 비속어 ${existingCount}개가 있습니다.`);
      Logger.log('기존 데이터를 모두 삭제하고 새로 삽입합니다...');
      await curseWordRepository.createQueryBuilder().delete().from(CurseWord).execute();
      Logger.log('기존 데이터 삭제 완료');
    }

    Logger.log(`총 ${CURSE_WORDS.length}개의 비속어를 삽입합니다...`);

    // 비속어 데이터 변환 및 삽입
    const wordsToInsert = CURSE_WORDS.map((word) => {
      const curseWord = new CurseWord();
      curseWord.word = word;
      return curseWord;
    });

    await curseWordRepository.save(wordsToInsert);

    Logger.log(`✅ ${CURSE_WORDS.length}개의 비속어가 성공적으로 삽입되었습니다.`);
  } catch (error) {
    Logger.error('❌ 비속어 시드 중 오류 발생:', error);
    throw error;
  } finally {
    await dataSource.destroy();
    Logger.log('데이터베이스 연결 종료');
  }
}

seedCurseWords()
  .then(() => {
    Logger.log('시드 완료');
    process.exit(0);
  })
  .catch((error) => {
    Logger.error('시드 실패:', error);
    process.exit(1);
  });
