import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSchedulingTypeAndBufferAndMaxPatientsToAvailability1781600000000 implements MigrationInterface {
  name = 'AddSchedulingTypeAndBufferAndMaxPatientsToAvailability1781600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "recurring_availabilities" ADD "schedulingType" character varying(10) NOT NULL DEFAULT 'STREAM'`,
    );
    await queryRunner.query(
      `ALTER TABLE "recurring_availabilities" ADD "bufferTime" integer NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(
      `ALTER TABLE "recurring_availabilities" ADD "maxPatients" integer NOT NULL DEFAULT 0`,
    );

    await queryRunner.query(
      `ALTER TABLE "custom_availabilities" ADD "schedulingType" character varying(10) NOT NULL DEFAULT 'STREAM'`,
    );
    await queryRunner.query(
      `ALTER TABLE "custom_availabilities" ADD "bufferTime" integer NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(
      `ALTER TABLE "custom_availabilities" ADD "maxPatients" integer NOT NULL DEFAULT 0`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "custom_availabilities" DROP COLUMN "maxPatients"`,
    );
    await queryRunner.query(
      `ALTER TABLE "custom_availabilities" DROP COLUMN "bufferTime"`,
    );
    await queryRunner.query(
      `ALTER TABLE "custom_availabilities" DROP COLUMN "schedulingType"`,
    );

    await queryRunner.query(
      `ALTER TABLE "recurring_availabilities" DROP COLUMN "maxPatients"`,
    );
    await queryRunner.query(
      `ALTER TABLE "recurring_availabilities" DROP COLUMN "bufferTime"`,
    );
    await queryRunner.query(
      `ALTER TABLE "recurring_availabilities" DROP COLUMN "schedulingType"`,
    );
  }
}
