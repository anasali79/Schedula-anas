import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReminderService } from './reminder.service';
import { Appointment } from '../appointment/entities/appointment.entity';
import { NotificationModule } from '../notification/notification.module';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Appointment]),
    NotificationModule,
    EmailModule,
  ],
  providers: [ReminderService],
  exports: [ReminderService],
})
export class ReminderModule {}
