import { MigrationInterface, QueryRunner } from 'typeorm';

export class Migration1768997486017 implements MigrationInterface {
  name = 'Migration1768997486017';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`game\` ADD \`time\` int NOT NULL`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`game\` DROP COLUMN \`time\``);
  }
}
