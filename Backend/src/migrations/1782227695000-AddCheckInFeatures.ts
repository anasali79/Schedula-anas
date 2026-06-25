import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCheckInFeatures1782227695000 implements MigrationInterface {
  name = 'AddCheckInFeatures1782227695000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Add checkedInAt column
    await queryRunner.query(
      `ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "checkedInAt" TIMESTAMP DEFAULT null`,
    );

    // 2. Rename existing BOOKED status values to CONFIRMED in the data
    await queryRunner.query(
      `UPDATE "appointments" SET "status" = 'CONFIRMED' WHERE "status" = 'BOOKED'`,
    );

    // 3. Update the default value of the status column
    await queryRunner.query(
      `ALTER TABLE "appointments" ALTER COLUMN "status" SET DEFAULT 'CONFIRMED'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert default
    await queryRunner.query(
      `ALTER TABLE "appointments" ALTER COLUMN "status" SET DEFAULT 'BOOKED'`,
    );

    // Revert CONFIRMED back to BOOKED
    await queryRunner.query(
      `UPDATE "appointments" SET "status" = 'BOOKED' WHERE "status" = 'CONFIRMED'`,
    );

    // Drop checkedInAt column
    await queryRunner.query(
      `ALTER TABLE "appointments" DROP COLUMN IF EXISTS "checkedInAt"`,
    );
  }
}
