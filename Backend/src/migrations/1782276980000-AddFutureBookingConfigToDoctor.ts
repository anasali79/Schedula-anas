import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddFutureBookingConfigToDoctor1782276980000 implements MigrationInterface {
  name = 'AddFutureBookingConfigToDoctor1782276980000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "doctors" ADD COLUMN IF NOT EXISTS "allowFutureBooking" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "doctors" ADD COLUMN IF NOT EXISTS "maxFutureBookingDays" integer DEFAULT null`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "doctors" DROP COLUMN IF EXISTS "maxFutureBookingDays"`,
    );
    await queryRunner.query(
      `ALTER TABLE "doctors" DROP COLUMN IF EXISTS "allowFutureBooking"`,
    );
  }
}
