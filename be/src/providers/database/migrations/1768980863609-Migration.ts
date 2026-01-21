import { MigrationInterface, QueryRunner } from 'typeorm';

export class Migration1768980863609 implements MigrationInterface {
  name = 'Migration1768980863609';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`game\` DROP COLUMN \`max_participants\``);
    await queryRunner.query(`ALTER TABLE \`game\` DROP COLUMN \`min_participants\``);
    await queryRunner.query(`ALTER TABLE \`game\` ADD \`max_players\` int NULL`);
    await queryRunner.query(`ALTER TABLE \`game\` ADD \`min_players\` int NULL`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`game\` DROP COLUMN \`min_players\``);
    await queryRunner.query(`ALTER TABLE \`game\` DROP COLUMN \`max_players\``);
    await queryRunner.query(`ALTER TABLE \`game\` ADD \`min_participants\` int NULL`);
    await queryRunner.query(`ALTER TABLE \`game\` ADD \`max_participants\` int NULL`);
  }
}
