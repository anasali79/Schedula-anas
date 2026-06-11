import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAvailabilityTables1749485000000
  implements MigrationInterface
{
  name = 'CreateAvailabilityTables1749485000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create ENUM type for day of week
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "public"."day_of_week_enum" AS ENUM(
          'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY',
          'FRIDAY', 'SATURDAY', 'SUNDAY'
        );
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // Recurring weekly availability table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "recurring_availabilities" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "doctorId" uuid NOT NULL,
        "dayOfWeek" "public"."day_of_week_enum" NOT NULL,
        "startTime" character varying(5) NOT NULL,
        "endTime" character varying(5) NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_recurring_availabilities_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_recurring_availabilities_doctorId"
          FOREIGN KEY ("doctorId") REFERENCES "doctors"("id") ON DELETE CASCADE
      )
    `);

    // Index for fast lookup by doctor + day
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_recurring_availabilities_doctor_day"
      ON "recurring_availabilities" ("doctorId", "dayOfWeek")
    `);

    // Custom date-specific availability override table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "custom_availabilities" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "doctorId" uuid NOT NULL,
        "date" date NOT NULL,
        "startTime" character varying(5) NOT NULL,
        "endTime" character varying(5) NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_custom_availabilities_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_custom_availabilities_doctorId"
          FOREIGN KEY ("doctorId") REFERENCES "doctors"("id") ON DELETE CASCADE
      )
    `);

    // Index for fast lookup by doctor + date
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_custom_availabilities_doctor_date"
      ON "custom_availabilities" ("doctorId", "date")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_custom_availabilities_doctor_date"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "custom_availabilities"`);

    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_recurring_availabilities_doctor_day"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "recurring_availabilities"`);

    await queryRunner.query(
      `DROP TYPE IF EXISTS "public"."day_of_week_enum"`,
    );
  }
}
