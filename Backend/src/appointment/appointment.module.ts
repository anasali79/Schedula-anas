import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppointmentController } from './appointment.controller';
import { AppointmentService } from './appointment.service';
import { QueueService } from './queue.service';
import { Appointment } from './entities/appointment.entity';
import { Doctor } from '../doctor/entities/doctor.entity';
import { Patient } from '../patient/entities/patient.entity';
import { DoctorLeave } from '../doctor/entities/leave.entity';
import { DoctorModule } from '../doctor/doctor.module';
import { NotificationModule } from '../notification/notification.module';
import { EmailModule } from '../email/email.module';
import { ReminderModule } from '../reminder/reminder.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Appointment, Doctor, Patient, DoctorLeave]),
    forwardRef(() => DoctorModule),
    NotificationModule,
    EmailModule,
    ReminderModule,
  ],
  controllers: [AppointmentController],
  providers: [AppointmentService, QueueService],
  exports: [AppointmentService, QueueService],
})
export class AppointmentModule {}
