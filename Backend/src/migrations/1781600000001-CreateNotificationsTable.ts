import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateNotificationsTable1781600000001 implements MigrationInterface {
  name = 'CreateNotificationsTable1781600000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "notifications" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "patientId" uuid NOT NULL,
        "title" character varying(255) NOT NULL,
        "message" text NOT NULL,
        "type" character varying(255) NOT NULL,
        "isRead" boolean NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_notifications_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_notifications_patientId"
          FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE
      )
    `);

    // Index for fast lookup of notifications by patient
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_notifications_patientId"
      ON "notifications" ("patientId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_notifications_patientId"
    `);
    await queryRunner.query(`
      DROP TABLE IF EXISTS "notifications"
    `);
  }
}
