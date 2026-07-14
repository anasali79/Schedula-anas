import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCheckInRequestsTable1782277000000
  implements MigrationInterface
{
  name = 'CreateCheckInRequestsTable1782277000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "check_in_requests" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "appointmentId" uuid NOT NULL,
        "patientId" uuid NOT NULL,
        "status" character varying NOT NULL DEFAULT 'PENDING',
        "expiresAt" TIMESTAMP NOT NULL,
        "respondedAt" TIMESTAMP,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_check_in_requests" PRIMARY KEY ("id"),
        CONSTRAINT "FK_check_in_requests_appointment" FOREIGN KEY ("appointmentId")
          REFERENCES "appointments"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_check_in_requests_patient" FOREIGN KEY ("patientId")
          REFERENCES "patients"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`
      CREATE INDEX "IDX_check_in_requests_patient_status"
      ON "check_in_requests" ("patientId", "status")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "check_in_requests"`);
  }
}
