import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CheckInController } from './check-in.controller';
import { KioskController } from './kiosk.controller';
import { CheckInService } from './check-in.service';
import { Appointment } from '../appointment/entities/appointment.entity';
import { Doctor } from '../doctor/entities/doctor.entity';
import { Patient } from '../patient/entities/patient.entity';
import { CheckInRequest } from './entities/check-in-request.entity';
import { AppointmentModule } from '../appointment/appointment.module';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Appointment, Doctor, Patient, CheckInRequest]),
    AppointmentModule,
    NotificationModule,
  ],
  controllers: [CheckInController, KioskController],
  providers: [CheckInService],
})
export class CheckInModule {}
