import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddReminderSentToAppointment1782227694000 implements MigrationInterface {
  name = 'AddReminderSentToAppointment1782227694000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "reminderSent" boolean NOT NULL DEFAULT false`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "appointments" DROP COLUMN IF EXISTS "reminderSent"`,
    );
  }
}
