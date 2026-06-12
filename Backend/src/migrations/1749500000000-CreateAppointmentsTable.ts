import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAppointmentsTable1749500000000 implements MigrationInterface {
  name = 'CreateAppointmentsTable1749500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "appointments" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "doctorId" uuid NOT NULL,
        "patientId" uuid NOT NULL,
        "date" date NOT NULL,
        "startTime" character varying(5) NOT NULL,
        "endTime" character varying(5) NOT NULL,
        "status" character varying(255) NOT NULL DEFAULT 'BOOKED',
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_appointments_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_appointments_doctorId"
          FOREIGN KEY ("doctorId") REFERENCES "doctors"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_appointments_patientId"
          FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE
      )
    `);

    // Index for fast lookup of appointments by doctor and date
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_appointments_doctor_date"
      ON "appointments" ("doctorId", "date")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_appointments_doctor_date"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "appointments"`);
  }
}
