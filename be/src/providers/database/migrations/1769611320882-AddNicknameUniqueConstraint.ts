import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddNicknameUniqueConstraint1769611320882 implements MigrationInterface {
  name = 'AddNicknameUniqueConstraint1769611320882';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`user\` ADD UNIQUE INDEX \`IDX_e2364281027b926b879fa2fa1e\` (\`nickname\`)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`user\` DROP INDEX \`IDX_e2364281027b926b879fa2fa1e\``);
  }
}
