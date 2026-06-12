import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateDoctorAndPatientProfiles1749398400000 implements MigrationInterface {
  name = 'CreateDoctorAndPatientProfiles1749398400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "doctors" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL,
        "fullName" character varying(255) NOT NULL,
        "specialization" character varying(255) NOT NULL,
        "experience" integer NOT NULL,
        "qualification" character varying(255) NOT NULL,
        "consultationFee" numeric(10,2) NOT NULL,
        "consultationHours" jsonb NOT NULL,
        "profileDetails" text,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_doctors_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_doctors_userId" UNIQUE ("userId"),
        CONSTRAINT "FK_doctors_userId" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "patients" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL,
        "fullName" character varying(255) NOT NULL,
        "age" integer NOT NULL,
        "gender" character varying(50) NOT NULL,
        "phone" character varying(20) NOT NULL,
        "address" character varying(500),
        "basicHealthInfo" text,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_patients_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_patients_userId" UNIQUE ("userId"),
        CONSTRAINT "FK_patients_userId" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "patients"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "doctors"`);
  }
}
