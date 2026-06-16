import { MigrationInterface, QueryRunner } from "typeorm";

export class AddTokenNumberToAppointment1781536427496 implements MigrationInterface {
    name = 'AddTokenNumberToAppointment1781536427496'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "doctors" DROP CONSTRAINT "FK_doctors_userId"`);
        await queryRunner.query(`ALTER TABLE "patients" DROP CONSTRAINT "FK_patients_userId"`);
        await queryRunner.query(`ALTER TABLE "recurring_availabilities" DROP CONSTRAINT "FK_recurring_availabilities_doctorId"`);
        await queryRunner.query(`ALTER TABLE "custom_availabilities" DROP CONSTRAINT "FK_custom_availabilities_doctorId"`);
        await queryRunner.query(`ALTER TABLE "appointments" DROP CONSTRAINT "FK_appointments_doctorId"`);
        await queryRunner.query(`ALTER TABLE "appointments" DROP CONSTRAINT "FK_appointments_patientId"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_recurring_availabilities_doctor_day"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_custom_availabilities_doctor_date"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_appointments_doctor_date"`);
        await queryRunner.query(`ALTER TABLE "appointments" ADD "tokenNumber" integer NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TYPE "public"."day_of_week_enum" RENAME TO "day_of_week_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."recurring_availabilities_dayofweek_enum" AS ENUM('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY')`);
        await queryRunner.query(`ALTER TABLE "recurring_availabilities" ALTER COLUMN "dayOfWeek" TYPE "public"."recurring_availabilities_dayofweek_enum" USING "dayOfWeek"::"text"::"public"."recurring_availabilities_dayofweek_enum"`);
        await queryRunner.query(`DROP TYPE "public"."day_of_week_enum_old"`);
        await queryRunner.query(`ALTER TABLE "appointments" DROP COLUMN "status"`);
        await queryRunner.query(`ALTER TABLE "appointments" ADD "status" character varying NOT NULL DEFAULT 'BOOKED'`);
        await queryRunner.query(`ALTER TABLE "doctors" ADD CONSTRAINT "FK_55651e05e46413d510215535edf" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "patients" ADD CONSTRAINT "FK_2c24c3490a26d04b0d70f92057a" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "recurring_availabilities" ADD CONSTRAINT "FK_83f738fc97c2ad1b48afc93c4ba" FOREIGN KEY ("doctorId") REFERENCES "doctors"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "custom_availabilities" ADD CONSTRAINT "FK_85d03cc0bee30c4f72f4ac00463" FOREIGN KEY ("doctorId") REFERENCES "doctors"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "appointments" ADD CONSTRAINT "FK_0c1af27b469cb8dca420c160d65" FOREIGN KEY ("doctorId") REFERENCES "doctors"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "appointments" ADD CONSTRAINT "FK_13c2e57cb81b44f062ba24df57d" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "appointments" DROP CONSTRAINT "FK_13c2e57cb81b44f062ba24df57d"`);
        await queryRunner.query(`ALTER TABLE "appointments" DROP CONSTRAINT "FK_0c1af27b469cb8dca420c160d65"`);
        await queryRunner.query(`ALTER TABLE "custom_availabilities" DROP CONSTRAINT "FK_85d03cc0bee30c4f72f4ac00463"`);
        await queryRunner.query(`ALTER TABLE "recurring_availabilities" DROP CONSTRAINT "FK_83f738fc97c2ad1b48afc93c4ba"`);
        await queryRunner.query(`ALTER TABLE "patients" DROP CONSTRAINT "FK_2c24c3490a26d04b0d70f92057a"`);
        await queryRunner.query(`ALTER TABLE "doctors" DROP CONSTRAINT "FK_55651e05e46413d510215535edf"`);
        await queryRunner.query(`ALTER TABLE "appointments" DROP COLUMN "status"`);
        await queryRunner.query(`ALTER TABLE "appointments" ADD "status" character varying(255) NOT NULL DEFAULT 'BOOKED'`);
        await queryRunner.query(`CREATE TYPE "public"."day_of_week_enum_old" AS ENUM('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY')`);
        await queryRunner.query(`ALTER TABLE "recurring_availabilities" ALTER COLUMN "dayOfWeek" TYPE "public"."day_of_week_enum_old" USING "dayOfWeek"::"text"::"public"."day_of_week_enum_old"`);
        await queryRunner.query(`DROP TYPE "public"."recurring_availabilities_dayofweek_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."day_of_week_enum_old" RENAME TO "day_of_week_enum"`);
        await queryRunner.query(`ALTER TABLE "appointments" DROP COLUMN "tokenNumber"`);
        await queryRunner.query(`CREATE INDEX "IDX_appointments_doctor_date" ON "appointments" USING btree ("date", "doctorId") `);
        await queryRunner.query(`CREATE INDEX "IDX_custom_availabilities_doctor_date" ON "custom_availabilities" USING btree ("date", "doctorId") `);
        await queryRunner.query(`CREATE INDEX "IDX_recurring_availabilities_doctor_day" ON "recurring_availabilities" USING btree ("dayOfWeek", "doctorId") `);
        await queryRunner.query(`ALTER TABLE "appointments" ADD CONSTRAINT "FK_appointments_patientId" FOREIGN KEY ("patientId") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "appointments" ADD CONSTRAINT "FK_appointments_doctorId" FOREIGN KEY ("doctorId") REFERENCES "doctors"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "custom_availabilities" ADD CONSTRAINT "FK_custom_availabilities_doctorId" FOREIGN KEY ("doctorId") REFERENCES "doctors"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "recurring_availabilities" ADD CONSTRAINT "FK_recurring_availabilities_doctorId" FOREIGN KEY ("doctorId") REFERENCES "doctors"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "patients" ADD CONSTRAINT "FK_patients_userId" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "doctors" ADD CONSTRAINT "FK_doctors_userId" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

}
