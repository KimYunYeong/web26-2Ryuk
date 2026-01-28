import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateUserEmailNullable1769538936763 implements MigrationInterface {
  name = 'UpdateUserEmailNullable1769538936763';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`user\` CHANGE \`email\` \`email\` varchar(255) NULL`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`user\` CHANGE \`email\` \`email\` varchar(255) NOT NULL`);
  }
}
