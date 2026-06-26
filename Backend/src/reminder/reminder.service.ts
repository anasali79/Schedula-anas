import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cron } from '@nestjs/schedule';
import { Appointment } from '../appointment/entities/appointment.entity';
import { AppointmentStatus } from '../common/enums/appointment-status.enum';
import { NotificationService } from '../notification/notification.service';
import { NotificationType } from '../notification/enums/notification-type.enum';
import { EmailService } from '../email/email.service';
import { formatTime, getTodayIST, getTomorrowIST } from '../common/utils/appointment.utils';

@Injectable()
export class ReminderService {
  private readonly logger = new Logger(ReminderService.name);

  constructor(
    @InjectRepository(Appointment)
    private readonly appointmentRepo: Repository<Appointment>,

    private readonly notificationService: NotificationService,
    private readonly emailService: EmailService,
  ) {}

  @Cron('0 6 * * *', { timeZone: 'Asia/Kolkata' })
  async sendMorningReminders(): Promise<void> {
    this.logger.log('[Cron 6AM] Running morning reminder job...');

    try {
      const todayStr = getTodayIST();

      const appointments = await this.appointmentRepo.find({
        where: {
          date: todayStr,
          status: AppointmentStatus.CONFIRMED,
          reminderSent: false,
        },
        relations: { doctor: true, patient: { user: true } },
      });

      this.logger.log(`[Cron 6AM] Found ${appointments.length} appointments for today.`);

      for (const appt of appointments) {
        try {
          const patientEmail = appt.patient?.user?.email;
          const patientName = appt.patient?.fullName || 'Patient';
          const doctorName = appt.doctor?.fullName || 'Doctor';

          if (patientEmail) {
            await this.emailService.sendAppointmentReminder(
              patientEmail,
              patientName,
              doctorName,
              appt.date,
              appt.startTime,
              appt.tokenNumber,
            );
          }

          const notifMsg = `Friendly reminder — your appointment with Dr. ${doctorName} is today at ${formatTime(appt.startTime)}!`;
          await this.notificationService.createNotification(
            appt.patientId,
            'Appointment Reminder',
            notifMsg,
            NotificationType.APPOINTMENT_REMINDER,
            appt.tokenNumber ? `Token Number: ${appt.tokenNumber}` : null,
          );

          appt.reminderSent = true;
          await this.appointmentRepo.save(appt);
        } catch (err: any) {
          this.logger.error(`[Cron 6AM] Failed for appointment ${appt.id}: ${err.message}`, err.stack);
        }
      }

      this.logger.log('[Cron 6AM] Morning reminder job completed.');
    } catch (err: any) {
      this.logger.error(`[Cron 6AM] Job failed: ${err.message}`, err.stack);
    }
  }

  @Cron('0 18 * * *', { timeZone: 'Asia/Kolkata' })
  async sendEveningReminders(): Promise<void> {
    this.logger.log('[Cron 6PM] Running evening reminder job for tomorrow...');

    try {
      const tomorrowStr = getTomorrowIST();

      const appointments = await this.appointmentRepo.find({
        where: {
          date: tomorrowStr,
          status: AppointmentStatus.CONFIRMED,
          reminderSent: false,
        },
        relations: { doctor: true, patient: { user: true } },
      });

      this.logger.log(`[Cron 6PM] Found ${appointments.length} appointments for tomorrow.`);

      for (const appt of appointments) {
        try {
          const patientEmail = appt.patient?.user?.email;
          const patientName = appt.patient?.fullName || 'Patient';
          const doctorName = appt.doctor?.fullName || 'Doctor';

          if (patientEmail) {
            await this.emailService.sendAppointmentReminder(
              patientEmail,
              patientName,
              doctorName,
              appt.date,
              appt.startTime,
              appt.tokenNumber,
            );
          }

          const notifMsg = `Reminder — you have an appointment with Dr. ${doctorName} tomorrow at ${formatTime(appt.startTime)}. Please be on time!`;
          await this.notificationService.createNotification(
            appt.patientId,
            'Appointment Tomorrow',
            notifMsg,
            NotificationType.APPOINTMENT_REMINDER,
            appt.tokenNumber ? `Token Number: ${appt.tokenNumber}` : null,
          );

          appt.reminderSent = true;
          await this.appointmentRepo.save(appt);
        } catch (err: any) {
          this.logger.error(`[Cron 6PM] Failed for appointment ${appt.id}: ${err.message}`, err.stack);
        }
      }

      this.logger.log('[Cron 6PM] Evening reminder job completed.');
    } catch (err: any) {
      this.logger.error(`[Cron 6PM] Job failed: ${err.message}`, err.stack);
    }
  }
}
