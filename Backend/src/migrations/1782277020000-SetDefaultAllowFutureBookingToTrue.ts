import { MigrationInterface, QueryRunner } from 'typeorm';

export class SetDefaultAllowFutureBookingToTrue1782277020000 implements MigrationInterface {
  name = 'SetDefaultAllowFutureBookingToTrue1782277020000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Change column default value to true
    await queryRunner.query(
      `ALTER TABLE "doctors" ALTER COLUMN "allowFutureBooking" SET DEFAULT true`,
    );
    // 2. Update existing doctors to true
    await queryRunner.query(
      `UPDATE "doctors" SET "allowFutureBooking" = true WHERE "allowFutureBooking" = false OR "allowFutureBooking" IS NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "doctors" ALTER COLUMN "allowFutureBooking" SET DEFAULT false`,
    );
  }
}
