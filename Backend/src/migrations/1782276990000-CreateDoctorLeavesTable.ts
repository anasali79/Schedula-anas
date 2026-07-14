import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateDoctorLeavesTable1782276990000 implements MigrationInterface {
  name = 'CreateDoctorLeavesTable1782276990000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "doctor_leaves" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "doctorId" uuid NOT NULL,
        "date" date NOT NULL,
        "reason" text,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_doctor_leaves_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_doctor_leaves_doctorId" FOREIGN KEY ("doctorId") REFERENCES "doctors"("id") ON DELETE CASCADE,
        CONSTRAINT "UQ_doctor_leaves_doctor_date" UNIQUE ("doctorId", "date")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_doctor_leaves_doctor_date" ON "doctor_leaves" ("doctorId", "date")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "IDX_doctor_leaves_doctor_date"
    `);
    await queryRunner.query(`
      DROP TABLE IF EXISTS "doctor_leaves"
    `);
  }
}
