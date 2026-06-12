import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSlotDurationToAvailability1749700000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add slotDuration column to recurring_availabilities
    await queryRunner.query(
      `ALTER TABLE "recurring_availabilities" ADD COLUMN "slotDuration" integer NOT NULL DEFAULT 15`,
    );

    // Add slotDuration column to custom_availabilities
    await queryRunner.query(
      `ALTER TABLE "custom_availabilities" ADD COLUMN "slotDuration" integer NOT NULL DEFAULT 15`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "custom_availabilities" DROP COLUMN "slotDuration"`,
    );
    await queryRunner.query(
      `ALTER TABLE "recurring_availabilities" DROP COLUMN "slotDuration"`,
    );
  }
}
