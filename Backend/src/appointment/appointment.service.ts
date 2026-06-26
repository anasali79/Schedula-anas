import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  forwardRef,
  Inject,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, DataSource } from 'typeorm';
import { Cron } from '@nestjs/schedule';
import { Appointment } from './entities/appointment.entity';
import { Doctor } from '../doctor/entities/doctor.entity';
import { Patient } from '../patient/entities/patient.entity';
import { BookAppointmentDto } from './dto/book-appointment.dto';
import { RescheduleAppointmentDto } from './dto/reschedule-appointment.dto';
import { AppointmentStatus } from '../common/enums/appointment-status.enum';
import { AvailabilityService } from '../doctor/availability.service';
import { SlotStatus } from '../doctor/dto/availability.dto';
import { NotificationService } from '../notification/notification.service';
import { NotificationType } from '../notification/enums/notification-type.enum';
import { EmailService } from '../email/email.service';
import { formatTime, formatDate, getTodayIST, getTomorrowIST } from '../common/utils/appointment.utils';

// ─── Constants ────────────────────────────────────────────────────────────────

const ARRIVAL_BUFFER_MINUTES = 5;
const RESCHEDULE_CUTOFF_MINUTES = 30;
const CANCEL_CUTOFF_MINUTES = 30;

// ─── Notification Helpers ─────────────────────────────────────────────────────


function buildAppointmentNotification(
  action: 'booked' | 'cancelled' | 'cancelled by the doctor' | 'rescheduled to',
  doctorName: string,
  date: string,
  startTime: string,
): { message: string; note: string | null } {
  const formattedDate = formatDate(date);
  const formattedTime = formatTime(startTime);

  const message =
    action === 'rescheduled to'
      ? `Your appointment with ${doctorName} has been rescheduled to ${formattedDate} at ${formattedTime}.`
      : `Your appointment with ${doctorName} on ${formattedDate} at ${formattedTime} has been ${action}.`;

  const isCancelled = action === 'cancelled' || action === 'cancelled by the doctor';
  const note = isCancelled
    ? null
    : `Please arrive ${ARRIVAL_BUFFER_MINUTES} minutes before your appointment time.`;

  return { message, note };
}

@Injectable()
export class AppointmentService {
  private readonly logger = new Logger(AppointmentService.name);

  constructor(
    @InjectRepository(Appointment)
    private readonly appointmentRepo: Repository<Appointment>,

    @InjectRepository(Doctor)
    private readonly doctorRepo: Repository<Doctor>,

    @InjectRepository(Patient)
    private readonly patientRepo: Repository<Patient>,

    @Inject(forwardRef(() => AvailabilityService))
    private readonly availabilityService: AvailabilityService,

    private readonly notificationService: NotificationService,
    private readonly emailService: EmailService,
    private readonly dataSource: DataSource,
  ) {

  }
  /**
   * Sends morning reminders for all booked appointments today.
   * Updates reminderSent flag to prevent duplicate notifications.
   */
  @Cron('0 6 * * *', { timeZone: 'Asia/Kolkata' })
  async sendMorningReminders(): Promise<void> {
    this.logger.log('[Cron 6AM] Running morning reminder job...');

    try {
      const todayStr = getTodayIST();
      this.logger.log(`[Cron 6AM] Fetching booked appointments for today (${todayStr})...`);

      const appointments = await this.appointmentRepo.find({
        where: {
          date: todayStr,
          status: AppointmentStatus.BOOKED,
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

          // 1. Email reminder
          if (patientEmail) {
            await this.emailService.sendAppointmentReminder(
              patientEmail,
              patientName,
              doctorName,
              appt.date,
              appt.startTime,
              appt.tokenNumber,
            );
            this.logger.log(`[Cron 6AM] Email sent to ${patientEmail} for appointment ${appt.id}`);
          }

          // 2. In-app notification
          const notifMsg = `Friendly reminder — your appointment with Dr. ${doctorName} is today at ${formatTime(appt.startTime)}!`;
          await this.notificationService.createNotification(
            appt.patientId,
            'Appointment Reminder 🗓',
            notifMsg,
            NotificationType.APPOINTMENT_REMINDER,
            appt.tokenNumber ? `Token Number: ${appt.tokenNumber}` : null,
          );
          this.logger.log(`[Cron 6AM] In-app notification sent to patient ${appt.patientId}`);

          // Mark reminderSent as true after successful send to prevent duplicates
          appt.reminderSent = true;
          await this.appointmentRepo.save(appt);

        } catch (err: any) {
          this.logger.error(
            `[Cron 6AM] Failed for appointment ${appt.id}: ${err.message}`,
            err.stack,
          );
          // Continue processing remaining appointments if one fails
        }
      }

      this.logger.log('[Cron 6AM] Morning reminder job completed.');
    } catch (err: any) {
      this.logger.error(`[Cron 6AM] Job failed: ${err.message}`, err.stack);
    }
  }

  /**
   * Sends evening reminders for tomorrow's booked appointments.
   */
  @Cron('0 18 * * *', { timeZone: 'Asia/Kolkata' })
  async sendEveningReminders(): Promise<void> {
    this.logger.log('[Cron 6PM] Running evening reminder job for tomorrow...');

    try {
      const tomorrowStr = getTomorrowIST();
      this.logger.log(`[Cron 6PM] Fetching booked appointments for tomorrow (${tomorrowStr})...`);

      const appointments = await this.appointmentRepo.find({
        where: {
          date: tomorrowStr,
          status: AppointmentStatus.BOOKED,
        },
        relations: { doctor: true, patient: { user: true } },
      });

      this.logger.log(`[Cron 6PM] Found ${appointments.length} appointments for tomorrow.`);

      for (const appt of appointments) {
        try {
          const patientEmail = appt.patient?.user?.email;
          const patientName = appt.patient?.fullName || 'Patient';
          const doctorName = appt.doctor?.fullName || 'Doctor';

          // 1. Email reminder
          if (patientEmail) {
            await this.emailService.sendAppointmentReminder(
              patientEmail,
              patientName,
              doctorName,
              appt.date,
              appt.startTime,
              appt.tokenNumber,
            );
            this.logger.log(`[Cron 6PM] Email sent to ${patientEmail} for appointment ${appt.id}`);
          }

          // 2. In-app notification
          const notifMsg = `Reminder — you have an appointment with Dr. ${doctorName} tomorrow at ${formatTime(appt.startTime)}. Please be on time!`;
          await this.notificationService.createNotification(
            appt.patientId,
            'Appointment Tomorrow 🗓',
            notifMsg,
            NotificationType.APPOINTMENT_REMINDER,
            appt.tokenNumber ? `Token Number: ${appt.tokenNumber}` : null,
          );
          this.logger.log(`[Cron 6PM] In-app notification sent to patient ${appt.patientId}`);

        } catch (err: any) {
          this.logger.error(
            `[Cron 6PM] Failed for appointment ${appt.id}: ${err.message}`,
            err.stack,
          );
        }
      }

      this.logger.log('[Cron 6PM] Evening reminder job completed.');
    } catch (err: any) {
      this.logger.error(`[Cron 6PM] Job failed: ${err.message}`, err.stack);
    }
  }

  // ─── Private Helpers ──────────────────────────────────────────────────────────

  private async getPatientByUserId(userId: string): Promise<Patient> {
    const patient = await this.patientRepo.findOne({
      where: { userId },
      relations: { user: true },
    });
    if (!patient) {
      throw new NotFoundException(
        'Patient profile not found. Please create your profile first.',
      );
    }
    return patient;
  }


  private async getDoctorByUserId(userId: string): Promise<Doctor> {
    const doctor = await this.doctorRepo.findOne({ where: { userId } });
    if (!doctor) {
      throw new NotFoundException(
        'Doctor profile not found. Please create your profile first.',
      );
    }
    return doctor;
  }


  private async sendNotification(
    patientId: string,
    title: string,
    message: string,
    type: NotificationType,
    note: string | null = null,
  ): Promise<void> {
    try {
      await this.notificationService.createNotification(patientId, title, message, type, note);
    } catch (error) {
      this.logger.error('Notification creation failed:', error);
    }
  }

  private async sendBookingEmail(appt: Appointment): Promise<void> {
    try {
      const email = appt.patient?.user?.email;
      if (!email) return;
      await this.emailService.sendBookingConfirmation(
        email,
        appt.patient.fullName,
        appt.doctor.fullName,
        appt.doctor.specialization,
        appt.date,
        appt.startTime,
        appt.tokenNumber,
        '9999999999', // Dummy contact number
      );
    } catch (error) {
      this.logger.error('Failed to send booking confirmation email:', error);
    }
  }

  private async sendCancellationEmail(appt: Appointment): Promise<void> {
    try {
      const email = appt.patient?.user?.email;
      if (!email) return;
      await this.emailService.sendCancellationNotification(
        email,
        appt.patient.fullName,
        appt.doctor.fullName,
        appt.date,
        appt.startTime,
      );
    } catch (error) {
      this.logger.error('Failed to send cancellation email:', error);
    }
  }

  private async sendRescheduleEmail(
    appt: Appointment,
    previousDate?: string,
    previousStartTime?: string,
  ): Promise<void> {
    try {
      const email = appt.patient?.user?.email;
      if (!email) return;
      await this.emailService.sendRescheduleNotification(
        email,
        appt.patient.fullName,
        appt.doctor.fullName,
        appt.doctor.specialization,
        appt.date,
        appt.startTime,
        appt.tokenNumber,
        previousDate,
        previousStartTime,
      );
    } catch (error) {
      this.logger.error('Failed to send reschedule email:', error);
    }
  }

  // ─── 1. Book Appointment ──────────────────────────────────────────────────────

  async bookAppointment(userId: string, dto: BookAppointmentDto) {
    const patient = await this.getPatientByUserId(userId);

    const doctor = await this.doctorRepo.findOne({ where: { id: dto.doctorId } });
    if (!doctor) throw new NotFoundException(`Doctor with ID ${dto.doctorId} not found`);

    this.validateFutureDateTime(dto.date, dto.startTime);

    const slotInfo = await this.validateSlotExists(dto.doctorId, dto.date, dto.startTime, dto.endTime);

    const patientHasBookingOnDay = await this.appointmentRepo.findOne({
      where: {
        patientId: patient.id,
        doctorId: dto.doctorId,
        date: dto.date,
        status: AppointmentStatus.BOOKED,
      },
    });
    if (patientHasBookingOnDay) {
      throw new ConflictException('You already have an appointment with this doctor on this day');
    }

    if (slotInfo.schedulingType === 'WAVE') {
      const bookedCount = slotInfo.bookedCount ?? 0;
      const maxPatients = slotInfo.maxPatients ?? 0;
      if (bookedCount >= maxPatients) throw new ConflictException('This slot is already booked');
    } else {
      const existingBooking = await this.appointmentRepo.findOne({
        where: {
          doctorId: dto.doctorId,
          date: dto.date,
          startTime: dto.startTime,
          endTime: dto.endTime,
          status: AppointmentStatus.BOOKED,
        },
      });
      if (existingBooking) throw new ConflictException('This slot is already booked');
    }
    let tokenNumber: number | null = null;
    if (slotInfo.schedulingType === 'WAVE') {
      const rawResult = (await this.appointmentRepo
        .createQueryBuilder('appointment')
        .select('MAX(appointment.tokenNumber)', 'max')
        .where('appointment.doctorId = :doctorId', { doctorId: dto.doctorId })
        .andWhere('appointment.date = :date', { date: dto.date })
        .andWhere('appointment.startTime = :startTime', { startTime: dto.startTime })
        .andWhere('appointment.endTime = :endTime', { endTime: dto.endTime })
        .getRawOne()) as unknown;
      const maxTokenResult = rawResult as { max: string | null } | undefined;
      const currentMax = maxTokenResult?.max ? parseInt(maxTokenResult.max, 10) : 0;
      tokenNumber = currentMax + 1;
    }
    const appointment = this.appointmentRepo.create({
      doctorId: dto.doctorId,
      patientId: patient.id,
      date: dto.date,
      startTime: dto.startTime,
      endTime: dto.endTime,
      status: AppointmentStatus.BOOKED,
      tokenNumber,
    });

    const saved = await this.appointmentRepo.save(appointment);

    const bookedNotif = buildAppointmentNotification('booked', doctor.fullName, dto.date, dto.startTime);
    await this.sendNotification(
      patient.id,
      'Appointment Booked',
      bookedNotif.message,
      NotificationType.APPOINTMENT_BOOKED,
      bookedNotif.note,
    );
    const fullAppointment = await this.appointmentRepo.findOne({
      where: { id: saved.id },
      relations: { doctor: true, patient: { user: true } },
    });

    if (!fullAppointment) {
      throw new NotFoundException('Appointment not found after save');
    }

    this.sendBookingEmail(fullAppointment).catch((err) =>
      this.logger.error('Failed to send booking confirmation email:', err),
    );

    return {
      message: 'Appointment booked successfully',
      data: this.toPatientAppointmentResponse(fullAppointment),
    };
  }

  // ─── 2. Patient Appointment View ──────────────────────────────────────────────

  async getPatientAppointments(userId: string) {
    const patient = await this.getPatientByUserId(userId);

    const appointments = await this.appointmentRepo.find({
      where: { patientId: patient.id },
      relations: { doctor: true },
      order: { date: 'DESC', startTime: 'DESC' },
    });

    return {
      message: appointments.length === 0 ? 'No appointments found' : 'Appointments retrieved successfully',
      data: appointments.map((appt) => this.toPatientAppointmentResponse(appt)),
    };
  }

  // ─── 3. Cancel Appointment ────────────────────────────────────────────────────

  async cancelAppointment(userId: string, appointmentId: string) {
    const patient = await this.getPatientByUserId(userId);
    const appointment = await this.appointmentRepo.findOne({
      where: { id: appointmentId },
      relations: { doctor: true, patient: { user: true } },
    });
    if (!appointment) throw new NotFoundException(`Appointment with ID ${appointmentId} not found`);

    if (appointment.patientId !== patient.id) {
      throw new ForbiddenException('Access denied: You can only cancel your own appointments');
    }
    if (appointment.status === AppointmentStatus.CANCELLED) {
      throw new BadRequestException('This appointment is already cancelled');
    }
    // Do not allow cancelling rescheduled appointments
    if (appointment.status === AppointmentStatus.RESCHEDULED) {
      throw new BadRequestException('Cannot cancel an already rescheduled appointment');
    }

    this.validateCancelCutoff(appointment.date, appointment.startTime);

    appointment.status = AppointmentStatus.CANCELLED;
    await this.appointmentRepo.save(appointment);

    const cancelledNotif = buildAppointmentNotification('cancelled', appointment.doctor.fullName, appointment.date, appointment.startTime);
    await this.sendNotification(
      patient.id,
      'Appointment Cancelled',
      cancelledNotif.message,
      NotificationType.APPOINTMENT_CANCELLED,
      cancelledNotif.note,
    );

    this.sendCancellationEmail(appointment).catch((err) =>
      this.logger.error('Failed to send cancellation email:', err),
    );

    return {
      message: 'Appointment cancelled successfully',
      data: this.toPatientAppointmentResponse(appointment),
    };
  }

  // ─── 3.5. Reschedule Appointment ──────────────────────────────────────────────

  async rescheduleAppointment(userId: string, appointmentId: string, dto: RescheduleAppointmentDto) {
    const patient = await this.getPatientByUserId(userId);

    const appointment = await this.appointmentRepo.findOne({
      where: { id: appointmentId },
      relations: { doctor: true, patient: true },
    });
    if (!appointment) throw new NotFoundException(`Appointment with ID ${appointmentId} not found`);

    if (appointment.patientId !== patient.id) {
      throw new ForbiddenException('Access denied: You can only reschedule your own appointments');
    }
    if (appointment.status === AppointmentStatus.CANCELLED) {
      throw new BadRequestException('Cannot reschedule a cancelled appointment');
    }
    if (appointment.status === AppointmentStatus.RESCHEDULED) {
      throw new BadRequestException('This appointment has already been rescheduled');
    }

    this.validateRescheduleCutoff(appointment.date, appointment.startTime);

    if (
      appointment.date === dto.date &&
      appointment.startTime === dto.startTime &&
      appointment.endTime === dto.endTime
    ) {
      throw new BadRequestException('Cannot reschedule to the same date and time slot');
    }

    this.validateFutureDateTime(dto.date, dto.startTime);

    const doctor = await this.doctorRepo.findOne({ where: { id: appointment.doctorId } });
    if (!doctor) throw new NotFoundException(`Doctor with ID ${appointment.doctorId} not found`);

    let slotInfo: {
      startTime: string;
      endTime: string;
      status: SlotStatus;
      schedulingType: string;
      maxPatients?: number;
      bookedCount?: number;
      availableCount?: number;
    };

    try {
      slotInfo = await this.validateSlotExists(appointment.doctorId, dto.date, dto.startTime, dto.endTime);
    } catch (error: any) {
      if (error instanceof BadRequestException || error instanceof ConflictException) {
        const suggestion = await this.availabilityService.findNextAvailableSlot(appointment.doctorId, dto.date);
        const response: any = {
          message: suggestion
            ? 'Requested slot is unavailable. Here is the next available slot.'
            : 'Requested slot is unavailable. No alternative slots found in the next 30 days.',
          error: (error as Error).message,
          ...(suggestion && { suggestedSlot: suggestion }),
        };
        throw new ConflictException(response);
      }
      throw error;
    }

    if (slotInfo.schedulingType === 'WAVE') {
      if ((slotInfo.bookedCount ?? 0) >= (slotInfo.maxPatients ?? 0)) {
        const suggestion = await this.availabilityService.findNextAvailableSlot(
          appointment.doctorId, dto.date, dto.startTime, dto.endTime,
        );
        throw new ConflictException({
          message: suggestion ? 'Requested wave is full. Here is the next available slot.' : 'Requested wave is full',
          ...(suggestion && { suggestedSlot: suggestion }),
        });
      }
    } else {
      const existingBooking = await this.appointmentRepo.findOne({
        where: {
          doctorId: appointment.doctorId,
          date: dto.date,
          startTime: dto.startTime,
          endTime: dto.endTime,
          status: AppointmentStatus.BOOKED,
        },
      });
      if (existingBooking) {
        const suggestion = await this.availabilityService.findNextAvailableSlot(
          appointment.doctorId, dto.date, dto.startTime, dto.endTime,
        );
        throw new ConflictException({
          message: suggestion ? 'Requested slot is already booked. Here is the next available slot.' : 'Requested slot is already booked',
          ...(suggestion && { suggestedSlot: suggestion }),
        });
      }
    }

    const patientHasBookingOnDay = await this.appointmentRepo.findOne({
      where: {
        patientId: patient.id,
        doctorId: appointment.doctorId,
        date: dto.date,
        status: AppointmentStatus.BOOKED,
        id: Not(appointmentId),
      },
    });
    if (patientHasBookingOnDay) {
      throw new ConflictException('You already have an appointment with this doctor on this day');
    }

    let tokenNumber: number | null = null;
    if (slotInfo.schedulingType === 'WAVE') {
      const rawResult = (await this.appointmentRepo
        .createQueryBuilder('appointment')
        .select('MAX(appointment.tokenNumber)', 'max')
        .where('appointment.doctorId = :doctorId', { doctorId: appointment.doctorId })
        .andWhere('appointment.date = :date', { date: dto.date })
        .andWhere('appointment.startTime = :startTime', { startTime: dto.startTime })
        .andWhere('appointment.endTime = :endTime', { endTime: dto.endTime })
        .getRawOne()) as unknown;
      const maxTokenResult = rawResult as { max: string | null } | undefined;
      const currentMax = maxTokenResult?.max ? parseInt(maxTokenResult.max, 10) : 0;
      tokenNumber = currentMax + 1;
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    const previousDate = appointment.date;
    const previousStartTime = appointment.startTime;

    try {
      appointment.status = AppointmentStatus.RESCHEDULED;
      await queryRunner.manager.save(appointment);

      const newAppointment = this.appointmentRepo.create({
        doctorId: appointment.doctorId,
        patientId: patient.id,
        date: dto.date,
        startTime: dto.startTime,
        endTime: dto.endTime,
        status: AppointmentStatus.BOOKED,
        tokenNumber,
      });

      const saved = await queryRunner.manager.save(newAppointment);
      await queryRunner.commitTransaction();

      const rescheduledNotif = buildAppointmentNotification('rescheduled to', appointment.doctor.fullName, dto.date, dto.startTime);
      await this.sendNotification(
        patient.id,
        'Appointment Rescheduled',
        rescheduledNotif.message,
        NotificationType.APPOINTMENT_RESCHEDULED,
        rescheduledNotif.note,
      );

      const fullAppointment = await this.appointmentRepo.findOne({
        where: { id: saved.id },
        relations: { doctor: true, patient: { user: true } },
      });

      if (fullAppointment) {
        this.sendRescheduleEmail(fullAppointment, previousDate, previousStartTime).catch((err) =>
          console.error('Failed to send reschedule email:', err),
        );
      }

      return {
        message: 'Appointment rescheduled successfully',
        data: {
          previousAppointment: {
            id: appointment.id,
            date: appointment.date,
            startTime: appointment.startTime,
            endTime: appointment.endTime,
            status: AppointmentStatus.RESCHEDULED,
          },
          newAppointment: this.toPatientAppointmentResponse(fullAppointment!),
        },
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  // ─── 4. Doctor Appointment View ───────────────────────────────────────────────

  async getDoctorAppointments(userId: string, date?: string) {
    const doctor = await this.getDoctorByUserId(userId);

    const whereClause: any = {
      doctorId: doctor.id,
      status: Not(AppointmentStatus.CANCELLED),
    };

    if (date) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        throw new BadRequestException('Invalid date format. Expected YYYY-MM-DD');
      }
      whereClause.date = date;
    }

    const appointments = await this.appointmentRepo.find({
      where: whereClause,
      relations: { patient: true },
      order: { date: 'DESC', startTime: 'DESC' },
    });

    return {
      message: appointments.length === 0 ? 'No appointments found' : 'Appointments retrieved successfully',
      data: appointments.map((appt) => this.toDoctorAppointmentResponse(appt)),
    };
  }

  // ─── 4.5. Doctor Cancel Appointment ───────────────────────────────────────────

  async cancelAppointmentByDoctor(userId: string, appointmentId: string) {
    const doctor = await this.getDoctorByUserId(userId);

    const appointment = await this.appointmentRepo.findOne({
      where: { id: appointmentId },
      relations: { doctor: true, patient: { user: true } },
    });
    if (!appointment) throw new NotFoundException(`Appointment with ID ${appointmentId} not found`);

    if (appointment.doctorId !== doctor.id) {
      throw new ForbiddenException('Access denied: You can only access your own appointments');
    }
    if (appointment.status === AppointmentStatus.CANCELLED) {
      throw new BadRequestException('This appointment is already cancelled');
    }

    appointment.status = AppointmentStatus.CANCELLED;
    const saved = await this.appointmentRepo.save(appointment);

    const doctorCancelNotif = buildAppointmentNotification('cancelled by the doctor', appointment.doctor.fullName, appointment.date, appointment.startTime);
    await this.sendNotification(
      appointment.patientId,
      'Appointment Cancelled by Doctor',
      doctorCancelNotif.message,
      NotificationType.APPOINTMENT_CANCELLED,
      doctorCancelNotif.note,
    );

    this.sendCancellationEmail(appointment).catch((err) =>
      console.error('Failed to send cancellation email:', err),
    );

    return {
      message: 'Appointment cancelled successfully',
      data: this.toDoctorAppointmentResponse(saved),
    };
  }

  // ─── 5. Patient Dashboard Stats ───────────────────────────────────────────────

  async getPatientDashboardStats(userId: string) {
    const patient = await this.getPatientByUserId(userId);

    const todayStr = getTodayIST();

    const upcomingAppointments = await this.appointmentRepo
      .createQueryBuilder('appointment')
      .where('appointment.patientId = :patientId', { patientId: patient.id })
      .andWhere('appointment.date >= :today', { today: todayStr })
      .andWhere('appointment.status = :status', { status: AppointmentStatus.BOOKED })
      .getCount();

    const pastAppointments = await this.appointmentRepo
      .createQueryBuilder('appointment')
      .where('appointment.patientId = :patientId', { patientId: patient.id })
      .andWhere('appointment.date < :today', { today: todayStr })
      .getCount();

    return {
      message: 'Dashboard statistics retrieved successfully',
      data: { upcomingAppointments, pastAppointments },
    };
  }

  // ─── Private Validators ───────────────────────────────────────────────────────

  private validateFutureDateTime(date: string, startTime: string): void {
    const todayStr = getTodayIST();

    if (date < todayStr) throw new BadRequestException('Cannot book appointment for a past date');

    if (date === todayStr) {
      // Use IST time for comparison
      const nowIST = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
      const currentMinutes = nowIST.getHours() * 60 + nowIST.getMinutes();
      const [h, m] = startTime.split(':').map(Number);
      if (h * 60 + m <= currentMinutes) {
        throw new BadRequestException('Cannot book appointment for a past time slot');
      }
    }
  }

  private async validateSlotExists(
    doctorId: string,
    date: string,
    startTime: string,
    endTime: string,
  ): Promise<{
    startTime: string;
    endTime: string;
    status: SlotStatus;
    schedulingType: string;
    maxPatients?: number;
    bookedCount?: number;
    availableCount?: number;
  }> {
    try {
      const availableSlots = await this.availabilityService.getAvailableSlots(doctorId, date);
      const validStatuses: string[] = [SlotStatus.AVAILABLE, SlotStatus.CANCEL_AND_AVAILABLE];
      const foundSlot = availableSlots.find(
        (slot) => slot.startTime === startTime && slot.endTime === endTime && validStatuses.includes(slot.status),
      );
      if (!foundSlot) throw new BadRequestException('Slot is not available for this doctor');
      return foundSlot;
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      if (error instanceof NotFoundException) {
        throw new BadRequestException(`No available slots found for this doctor on ${date}`);
      }
      throw error;
    }
  }

  private validateCancelCutoff(date: string, startTime: string): void {
    const todayStr = getTodayIST();

    if (date < todayStr) throw new BadRequestException('Cannot cancel a past appointment');

    if (date === todayStr) {
      const nowIST = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
      const currentMinutes = nowIST.getHours() * 60 + nowIST.getMinutes();
      const [h, m] = startTime.split(':').map(Number);
      const slotMinutes = h * 60 + m;
      if (slotMinutes <= currentMinutes) throw new BadRequestException('Cannot cancel a past appointment');
      if (slotMinutes - currentMinutes < CANCEL_CUTOFF_MINUTES) {
        throw new BadRequestException(
          `Cannot cancel appointment: less than ${CANCEL_CUTOFF_MINUTES} minutes before the appointment start time`,
        );
      }
    }
  }

  private validateRescheduleCutoff(date: string, startTime: string): void {
    const todayStr = getTodayIST();

    if (date < todayStr) throw new BadRequestException('Cannot reschedule a past appointment');

    if (date === todayStr) {
      const nowIST = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
      const currentMinutes = nowIST.getHours() * 60 + nowIST.getMinutes();
      const [h, m] = startTime.split(':').map(Number);
      const slotMinutes = h * 60 + m;
      if (slotMinutes <= currentMinutes) throw new BadRequestException('Cannot reschedule a past appointment');
      if (slotMinutes - currentMinutes < RESCHEDULE_CUTOFF_MINUTES) {
        throw new BadRequestException(
          `Cannot reschedule appointment: less than ${RESCHEDULE_CUTOFF_MINUTES} minutes before the appointment start time`,
        );
      }
    }
  }

  private toPatientAppointmentResponse(appointment: Appointment) {
    return {
      id: appointment.id,
      date: appointment.date,
      startTime: appointment.startTime,
      endTime: appointment.endTime,
      status: appointment.status,
      ...(appointment.tokenNumber !== null && { tokenNumber: appointment.tokenNumber }),
      doctor: appointment.doctor
        ? {
          id: appointment.doctor.id,
          fullName: appointment.doctor.fullName,
          specialization: appointment.doctor.specialization,
          consultationFee: Number(appointment.doctor.consultationFee),
        }
        : null,
      createdAt: appointment.createdAt,
      updatedAt: appointment.updatedAt,
    };
  }

  private toDoctorAppointmentResponse(appointment: Appointment) {
    return {
      id: appointment.id,
      date: appointment.date,
      startTime: appointment.startTime,
      endTime: appointment.endTime,
      status: appointment.status,
      schedulingType: appointment.tokenNumber !== null ? 'WAVE' : 'STREAM',
      ...(appointment.tokenNumber !== null && { tokenNumber: appointment.tokenNumber }),
      patient: appointment.patient
        ? {
          id: appointment.patient.id,
          fullName: appointment.patient.fullName,
          age: appointment.patient.age,
          gender: appointment.patient.gender,
          phone: appointment.patient.phone,
        }
        : null,
      createdAt: appointment.createdAt,
      updatedAt: appointment.updatedAt,
    };
  }
} 