import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DoctorController } from './doctor.controller';
import { DoctorService } from './doctor.service';
import { Doctor } from './entities/doctor.entity';
import { RecurringAvailability } from './entities/recurring-availability.entity';
import { CustomAvailability } from './entities/custom-availability.entity';
import { AvailabilityService } from './availability.service';
import { AvailabilityController } from './availability.controller';
import { Appointment } from '../appointment/entities/appointment.entity';
import { AppointmentModule } from '../appointment/appointment.module';
import { User } from '../users/entities/user.entity';
import { Patient } from '../patient/entities/patient.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Doctor,
      RecurringAvailability,
      CustomAvailability,
      Appointment,
      User,
      Patient,
    ]),
    forwardRef(() => AppointmentModule),
  ],
  controllers: [AvailabilityController, DoctorController],
  providers: [DoctorService, AvailabilityService],
  exports: [DoctorService, AvailabilityService],
})
export class DoctorModule { }
