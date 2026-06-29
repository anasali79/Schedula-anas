import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CheckInController } from './check-in.controller';
import { CheckInService } from './check-in.service';
import { Appointment } from '../appointment/entities/appointment.entity';
import { Doctor } from '../doctor/entities/doctor.entity';
import { Patient } from '../patient/entities/patient.entity';
import { AppointmentModule } from '../appointment/appointment.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Appointment, Doctor, Patient]),
    AppointmentModule,
  ],
  controllers: [CheckInController],
  providers: [CheckInService],
})
export class CheckInModule {}
