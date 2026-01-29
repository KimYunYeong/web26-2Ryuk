import { MigrationInterface, QueryRunner } from 'typeorm';

export class Migration1769595626522 implements MigrationInterface {
  name = 'Migration1769595626522';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`user\` ADD UNIQUE INDEX \`IDX_e2364281027b926b879fa2fa1e\` (\`nickname\`)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`user\` DROP INDEX \`IDX_e2364281027b926b879fa2fa1e\``);
  }
}
