import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PatientController } from './patient.controller';
import { PatientService } from './patient.service';
import { Patient } from './entities/patient.entity';
import { AppointmentModule } from '../appointment/appointment.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Patient]),
    AppointmentModule,
  ],
  controllers: [PatientController],
  providers: [PatientService],
  exports: [PatientService],
})
export class PatientModule {}
