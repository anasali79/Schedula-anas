import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  forwardRef,
  Inject,
  Logger,
  Optional,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, DataSource, EntityManager } from 'typeorm';
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
import { formatTime, formatDate, getTodayIST } from '../common/utils/appointment.utils';
import { AppointmentGateway, SOCKET_EVENTS } from '../sockets/appointment.gateway';
import { QueueService } from './queue.service';

const ARRIVAL_BUFFER_MINUTES = 5;
const RESCHEDULE_CUTOFF_MINUTES = 30;
const CANCEL_CUTOFF_MINUTES = 30;

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
    private readonly queueService: QueueService,

    @Optional()
    private readonly appointmentGateway: AppointmentGateway,
  ) { }

  private async getPatientByUserId(userId: string): Promise<Patient> {
    const patient = await this.patientRepo.findOne({
      where: { userId },
      relations: { user: true },
    });
    if (!patient) {
      throw new NotFoundException('Patient profile not found. Please create your profile first.');
    }
    return patient;
  }

  private async getDoctorByUserId(userId: string): Promise<Doctor> {
    const doctor = await this.doctorRepo.findOne({ where: { userId } });
    if (!doctor) {
      throw new NotFoundException('Doctor profile not found. Please create your profile first.');
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
        appt.doctor.phone ?? null,
        appt.id,
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

  private async assignTokenNumber(
    manager: EntityManager,
    doctorId: string,
    date: string,
    startTime: string,
    endTime: string,
  ): Promise<number> {
    const rawResult = (await manager
      .createQueryBuilder(Appointment, 'appointment')
      .select('MAX(appointment.tokenNumber)', 'max')
      .where('appointment.doctorId = :doctorId', { doctorId })
      .andWhere('appointment.date = :date', { date })
      .andWhere('appointment.startTime = :startTime', { startTime })
      .andWhere('appointment.endTime = :endTime', { endTime })
      .setLock('pessimistic_write')
      .getRawOne()) as unknown;

    const maxTokenResult = rawResult as { max: string | null } | undefined;
    const currentMax = maxTokenResult?.max ? parseInt(maxTokenResult.max, 10) : 0;
    return currentMax + 1;
  }

  async bookAppointment(userId: string, dto: BookAppointmentDto) {
    const patient = await this.getPatientByUserId(userId);

    const doctor = await this.doctorRepo.findOne({ where: { id: dto.doctorId } });
    if (!doctor) throw new NotFoundException(`Doctor with ID ${dto.doctorId} not found`);

    this.validateBookingWindow(dto.date, dto.startTime);

    const slotInfo = await this.validateSlotExists(dto.doctorId, dto.date, dto.startTime, dto.endTime);

    const patientHasBookingOnDay = await this.appointmentRepo.findOne({
      where: {
        patientId: patient.id,
        doctorId: dto.doctorId,
        date: dto.date,
        status: AppointmentStatus.CONFIRMED,
      },
    });
    if (patientHasBookingOnDay) {
      throw new ConflictException('You already have an appointment with this doctor on this day');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction('SERIALIZABLE');

    let saved: Appointment;
    try {
      if (slotInfo.schedulingType === 'WAVE') {
        const bookedCount = slotInfo.bookedCount ?? 0;
        const maxPatients = slotInfo.maxPatients ?? 0;
        if (bookedCount >= maxPatients) throw new ConflictException('This slot is already booked');
      } else {
        const existingBooking = await queryRunner.manager.findOne(Appointment, {
          where: {
            doctorId: dto.doctorId,
            date: dto.date,
            startTime: dto.startTime,
            endTime: dto.endTime,
            status: AppointmentStatus.CONFIRMED,
          },
          lock: { mode: 'pessimistic_write' },
          loadEagerRelations: false,
        });
        if (existingBooking) throw new ConflictException('This slot is already booked');
      }

      let tokenNumber: number | null = null;
      if (slotInfo.schedulingType === 'WAVE') {
        tokenNumber = await this.assignTokenNumber(
          queryRunner.manager,
          dto.doctorId,
          dto.date,
          dto.startTime,
          dto.endTime,
        );
      }

      const appointment = this.appointmentRepo.create({
        doctorId: dto.doctorId,
        patientId: patient.id,
        date: dto.date,
        startTime: dto.startTime,
        endTime: dto.endTime,
        status: AppointmentStatus.CONFIRMED,
        tokenNumber,
      });

      saved = await queryRunner.manager.save(appointment);

      const todayStr = getTodayIST();
      if (saved.date === todayStr) {
        await this.queueService.recalculateQueue(saved.doctorId, saved.date, queryRunner.manager);
      }

      await queryRunner.commitTransaction();
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }

    const todayStr = getTodayIST();
    if (saved.date === todayStr) {
      await this.queueService.broadcastQueueStatus(saved.doctorId, saved.date, this.dataSource.manager);
    }

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
    if (appointment.status === AppointmentStatus.RESCHEDULED) {
      throw new BadRequestException('Cannot cancel an already rescheduled appointment');
    }

    this.validateCancelCutoff(appointment.date, appointment.startTime);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const app = await queryRunner.manager.findOne(Appointment, {
        where: { id: appointmentId },
        lock: { mode: 'pessimistic_write' },
        loadEagerRelations: false,
      });

      if (!app || app.status === AppointmentStatus.CANCELLED) {
        throw new BadRequestException('Appointment is already cancelled');
      }

      app.status = AppointmentStatus.CANCELLED;
      await queryRunner.manager.save(app);

      await this.queueService.recalculateQueue(app.doctorId, app.date, queryRunner.manager);
      await queryRunner.commitTransaction();

      appointment.status = AppointmentStatus.CANCELLED;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }

    this.appointmentGateway?.emitAppointmentEvent(SOCKET_EVENTS.CANCELLED, {
      appointmentId: appointment.id,
      patientId: appointment.patientId,
      doctorId: appointment.doctorId,
      status: AppointmentStatus.CANCELLED,
      updatedAt: new Date().toISOString(),
    });

    await this.queueService.broadcastQueueStatus(appointment.doctorId, appointment.date, this.dataSource.manager);

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
          status: AppointmentStatus.CONFIRMED,
        },
      });
      if (existingBooking) {
        const suggestion = await this.availabilityService.findNextAvailableSlot(
          appointment.doctorId, dto.date, dto.startTime, dto.endTime,
        );
        throw new ConflictException({
          message: suggestion
            ? 'Requested slot is already booked. Here is the next available slot.'
            : 'Requested slot is already booked',
          ...(suggestion && { suggestedSlot: suggestion }),
        });
      }
    }

    const patientHasBookingOnDay = await this.appointmentRepo.findOne({
      where: {
        patientId: patient.id,
        doctorId: appointment.doctorId,
        date: dto.date,
        status: AppointmentStatus.CONFIRMED,
        id: Not(appointmentId),
      },
    });
    if (patientHasBookingOnDay) {
      throw new ConflictException('You already have an appointment with this doctor on this day');
    }

    const previousDate = appointment.date;
    const previousStartTime = appointment.startTime;

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction('SERIALIZABLE');

    let savedNewAppointment: Appointment;

    try {
      const appToLock = await queryRunner.manager.findOne(Appointment, {
        where: { id: appointment.id },
        lock: { mode: 'pessimistic_write' },
        loadEagerRelations: false,
      });

      if (!appToLock || appToLock.status === AppointmentStatus.RESCHEDULED) {
        throw new BadRequestException('Appointment is already rescheduled');
      }

      appToLock.status = AppointmentStatus.RESCHEDULED;
      await queryRunner.manager.save(appToLock);

      let tokenNumber: number | null = null;
      if (slotInfo.schedulingType === 'WAVE') {
        tokenNumber = await this.assignTokenNumber(
          queryRunner.manager,
          appointment.doctorId,
          dto.date,
          dto.startTime,
          dto.endTime,
        );
      }

      const newAppointment = this.appointmentRepo.create({
        doctorId: appointment.doctorId,
        patientId: patient.id,
        date: dto.date,
        startTime: dto.startTime,
        endTime: dto.endTime,
        status: AppointmentStatus.CONFIRMED,
        tokenNumber,
      });

      savedNewAppointment = await queryRunner.manager.save(newAppointment);

      const todayStr = getTodayIST();
      if (previousDate === todayStr) {
        await this.queueService.recalculateQueue(appointment.doctorId, previousDate, queryRunner.manager);
      }
      if (savedNewAppointment.date === todayStr) {
        await this.queueService.recalculateQueue(savedNewAppointment.doctorId, savedNewAppointment.date, queryRunner.manager);
      }

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }

    const todayStr = getTodayIST();
    if (previousDate === todayStr) {
      await this.queueService.broadcastQueueStatus(appointment.doctorId, previousDate, this.dataSource.manager);
    }
    if (savedNewAppointment.date === todayStr) {
      await this.queueService.broadcastQueueStatus(savedNewAppointment.doctorId, savedNewAppointment.date, this.dataSource.manager);
    }

    appointment.status = AppointmentStatus.RESCHEDULED;

    const rescheduledNotif = buildAppointmentNotification('rescheduled to', appointment.doctor.fullName, dto.date, dto.startTime);
    await this.sendNotification(
      patient.id,
      'Appointment Rescheduled',
      rescheduledNotif.message,
      NotificationType.APPOINTMENT_RESCHEDULED,
      rescheduledNotif.note,
    );

    const fullNewAppointment = await this.appointmentRepo.findOne({
      where: { id: savedNewAppointment.id },
      relations: { doctor: true, patient: { user: true } },
    });

    if (fullNewAppointment) {
      this.sendRescheduleEmail(fullNewAppointment, previousDate, previousStartTime).catch((err) =>
        this.logger.error('Failed to send reschedule email:', err),
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
        newAppointment: this.toPatientAppointmentResponse(fullNewAppointment!),
      },
    };
  }

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

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    let saved: Appointment;
    try {
      const app = await queryRunner.manager.findOne(Appointment, {
        where: { id: appointmentId },
        lock: { mode: 'pessimistic_write' },
        loadEagerRelations: false,
      });

      if (!app || app.status === AppointmentStatus.CANCELLED) {
        throw new BadRequestException('Appointment is already cancelled');
      }

      app.status = AppointmentStatus.CANCELLED;
      saved = await queryRunner.manager.save(app);

      await this.queueService.recalculateQueue(doctor.id, appointment.date, queryRunner.manager);
      await queryRunner.commitTransaction();

      appointment.status = AppointmentStatus.CANCELLED;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }

    this.appointmentGateway?.emitAppointmentEvent(SOCKET_EVENTS.CANCELLED, {
      appointmentId: appointment.id,
      patientId: appointment.patientId,
      doctorId: appointment.doctorId,
      status: AppointmentStatus.CANCELLED,
      updatedAt: new Date().toISOString(),
    });

    await this.queueService.broadcastQueueStatus(doctor.id, appointment.date, this.dataSource.manager);

    const doctorCancelNotif = buildAppointmentNotification('cancelled by the doctor', appointment.doctor.fullName, appointment.date, appointment.startTime);
    await this.sendNotification(
      appointment.patientId,
      'Appointment Cancelled by Doctor',
      doctorCancelNotif.message,
      NotificationType.APPOINTMENT_CANCELLED,
      doctorCancelNotif.note,
    );

    this.sendCancellationEmail(appointment).catch((err) =>
      this.logger.error('Failed to send cancellation email:', err),
    );

    return {
      message: 'Appointment cancelled successfully',
      data: this.toDoctorAppointmentResponse(saved),
    };
  }

  async getPatientDashboardStats(userId: string) {
    const patient = await this.getPatientByUserId(userId);

    const todayStr = getTodayIST();

    const upcomingAppointments = await this.appointmentRepo
      .createQueryBuilder('appointment')
      .where('appointment.patientId = :patientId', { patientId: patient.id })
      .andWhere('appointment.date >= :today', { today: todayStr })
      .andWhere('appointment.status = :status', { status: AppointmentStatus.CONFIRMED })
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

  private validateFutureDateTime(date: string, startTime: string): void {
    const todayStr = getTodayIST();

    if (date < todayStr) throw new BadRequestException('Cannot book appointment for a past date');

    if (date === todayStr) {
      const nowIST = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
      const currentMinutes = nowIST.getHours() * 60 + nowIST.getMinutes();
      const [h, m] = startTime.split(':').map(Number);
      if (h * 60 + m <= currentMinutes) {
        throw new BadRequestException('Cannot book appointment for a past time slot');
      }
    }
  }

  /**
   * Booking Window Validation (Iteration 1)
   * Appointments can only be booked for today's date.
   * - Past dates  → rejected
   * - Future dates (tomorrow or beyond) → rejected
   * - Today, but already-passed time slot → rejected
   */
  private validateBookingWindow(date: string, startTime: string): void {
    const todayStr = getTodayIST();

    if (date < todayStr) {
      throw new BadRequestException('Cannot book an appointment for a past date');
    }

    if (date > todayStr) {
      throw new BadRequestException('Appointments can only be booked for today');
    }

    // date === todayStr — ensure the time slot hasn't already passed
    const nowIST = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    const currentMinutes = nowIST.getHours() * 60 + nowIST.getMinutes();
    const [h, m] = startTime.split(':').map(Number);
    if (h * 60 + m <= currentMinutes) {
      throw new BadRequestException('Cannot book an appointment for a past time slot');
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
      checkedInAt: appointment.checkedInAt ?? null,
      queuePosition: appointment.queuePosition ?? null,
      estimatedWaitTime: appointment.estimatedWaitTime ?? null,
      servedAt: appointment.servedAt ?? null,
      completedAt: appointment.completedAt ?? null,
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
      checkedInAt: appointment.checkedInAt ?? null,
      queuePosition: appointment.queuePosition ?? null,
      estimatedWaitTime: appointment.estimatedWaitTime ?? null,
      servedAt: appointment.servedAt ?? null,
      completedAt: appointment.completedAt ?? null,
      createdAt: appointment.createdAt,
      updatedAt: appointment.updatedAt,
    };
  }
}