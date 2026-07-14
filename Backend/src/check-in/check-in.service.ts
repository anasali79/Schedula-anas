import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, LessThan } from 'typeorm';
import { Appointment } from '../appointment/entities/appointment.entity';
import { Doctor } from '../doctor/entities/doctor.entity';
import { Patient } from '../patient/entities/patient.entity';
import { AppointmentStatus } from '../common/enums/appointment-status.enum';
import { getTodayIST } from '../common/utils/appointment.utils';
import { AppointmentGateway, SOCKET_EVENTS } from '../sockets/appointment.gateway';
import { QueueService } from '../appointment/queue.service';
import { CheckInRequest } from './entities/check-in-request.entity';
import { CheckInRequestStatus } from './enums/check-in-request-status.enum';
import { NotificationService } from '../notification/notification.service';
import { NotificationType } from '../notification/enums/notification-type.enum';

@Injectable()
export class CheckInService {
  constructor(
    @InjectRepository(Appointment)
    private readonly appointmentRepo: Repository<Appointment>,

    @InjectRepository(Doctor)
    private readonly doctorRepo: Repository<Doctor>,

    @InjectRepository(Patient)
    private readonly patientRepo: Repository<Patient>,

    @InjectRepository(CheckInRequest)
    private readonly checkInRequestRepo: Repository<CheckInRequest>,

    private readonly queueService: QueueService,
    private readonly dataSource: DataSource,
    private readonly notificationService: NotificationService,

    @Optional()
    private readonly appointmentGateway: AppointmentGateway,
  ) { }

  // ─── Private Helpers ──────────────────────────────────────────────────────────

  private async getPatientByUserId(userId: string): Promise<Patient> {
    const patient = await this.patientRepo.findOne({ where: { userId } });
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

  // ─── 1. Patient QR Check-In ───────────────────────────────────────────────────

  async checkIn(userId: string, appointmentId: string) {
    const patient = await this.getPatientByUserId(userId);

    const appointment = await this.appointmentRepo.findOne({
      where: { id: appointmentId },
      relations: { doctor: true, patient: { user: true } },
    });

    if (!appointment) {
      throw new NotFoundException(`Appointment with ID ${appointmentId} not found`);
    }

    // Security: patient can only check in to their own appointment
    if (appointment.patientId !== patient.id) {
      throw new ForbiddenException('You are not authorized to check in for this appointment');
    }

    return this.performCheckIn(appointment);
  }

  // ─── 2. Doctor Manual Check-In ────────────────────────────────────────────────

  async manualCheckIn(userId: string, appointmentId: string) {
    const doctor = await this.getDoctorByUserId(userId);

    const appointment = await this.appointmentRepo.findOne({
      where: { id: appointmentId },
      relations: { doctor: true, patient: { user: true } },
    });

    if (!appointment) {
      throw new NotFoundException(`Appointment with ID ${appointmentId} not found`);
    }

    // Security: doctor can only manually check in patients from their own appointments
    if (appointment.doctorId !== doctor.id) {
      throw new ForbiddenException('You are not authorized to check in for this appointment');
    }

    return this.performCheckIn(appointment);
  }

  // ─── Core Check-In Logic (shared by QR and Manual) ───────────────────────────

  private async performCheckIn(appointment: Appointment) {
    const todayStr = getTodayIST();

    // ── Status validations ────────────────────────────────────────────────────
    if (appointment.status === AppointmentStatus.CHECKED_IN) {
      throw new ConflictException('Patient already checked in');
    }
    if (appointment.status === AppointmentStatus.CANCELLED) {
      throw new BadRequestException('Cannot check in for a cancelled appointment');
    }
    if (appointment.status === AppointmentStatus.COMPLETED) {
      throw new BadRequestException('Appointment already completed');
    }
    if (appointment.status === AppointmentStatus.NO_SHOW) {
      throw new BadRequestException('Appointment marked as no-show');
    }
    if (appointment.status === AppointmentStatus.IN_CONSULTATION) {
      throw new BadRequestException('Patient is already in consultation');
    }
    if (appointment.status === AppointmentStatus.RESCHEDULED) {
      throw new BadRequestException('Appointment no longer active');
    }

    // ── Date validations ──────────────────────────────────────────────────────
    if (appointment.date > todayStr) {
      throw new BadRequestException('Check-in allowed only on appointment date');
    }
    if (appointment.date < todayStr) {
      throw new BadRequestException('Appointment expired');
    }

    // ── Transaction-based check-in and queue recalculation ───────────────────
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    let app: Appointment | null = null;
    try {
      app = await queryRunner.manager
        .createQueryBuilder(Appointment, 'a')
        .where('a.id = :id', { id: appointment.id })
        .setLock('pessimistic_write')
        .getOne();

      if (!app || app.status !== AppointmentStatus.CONFIRMED) {
        throw new ConflictException('Patient already checked in or status changed');
      }

      // Update check-in properties
      app.status = AppointmentStatus.CHECKED_IN;
      app.checkedInAt = new Date();
      await queryRunner.manager.save(app);

      // Recalculate queue position and wait times
      await this.queueService.recalculateQueue(app.doctorId, app.date, queryRunner.manager);

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }

    // ── Post-commit side effects (outside transaction) ────────────────────────
    // These run only if commit succeeded. Errors here will NOT cause a rollback.
    this.appointmentGateway?.emitAppointmentEvent(
      SOCKET_EVENTS.CHECKED_IN,
      {
        appointmentId: app!.id,
        patientId:     app!.patientId,
        doctorId:      app!.doctorId,
        status:        AppointmentStatus.CHECKED_IN,
        updatedAt:     app!.checkedInAt!.toISOString(),
      },
    );

    await this.queueService.broadcastQueueStatus(app!.doctorId, app!.date, this.dataSource.manager);

    return {
      success: true,
      message: 'Checked in successfully',
    };
  }

  // ─── 3. Doctor Start Consultation ─────────────────────────────────────────────

  async startConsultation(userId: string, appointmentId: string) {
    const doctor = await this.getDoctorByUserId(userId);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    let appointment: Appointment | null = null;
    try {
      appointment = await queryRunner.manager
        .createQueryBuilder(Appointment, 'a')
        .where('a.id = :id', { id: appointmentId })
        .setLock('pessimistic_write')
        .getOne();

      if (!appointment) {
        throw new NotFoundException(`Appointment with ID ${appointmentId} not found`);
      }

      if (appointment.doctorId !== doctor.id) {
        throw new ForbiddenException('You are not authorized to manage this appointment');
      }

      if (appointment.status !== AppointmentStatus.CHECKED_IN) {
        throw new BadRequestException(
          `Cannot start consultation. Appointment status is ${appointment.status}, expected CHECKED_IN.`,
        );
      }

      // Auto-complete any existing IN_CONSULTATION appointment to prevent conflicts
      const activeConsultations = await queryRunner.manager
        .createQueryBuilder(Appointment, 'a')
        .where('a.doctorId = :doctorId', { doctorId: doctor.id })
        .andWhere('a.date = :date', { date: appointment.date })
        .andWhere('a.status = :status', { status: AppointmentStatus.IN_CONSULTATION })
        .setLock('pessimistic_write')
        .getMany();

      for (const app of activeConsultations) {
        app.status = AppointmentStatus.COMPLETED;
        app.completedAt = new Date();
        await queryRunner.manager.save(app);
      }

      // Start the consultation
      appointment.status = AppointmentStatus.IN_CONSULTATION;
      appointment.servedAt = new Date();
      await queryRunner.manager.save(appointment);

      // Recalculate queue
      await this.queueService.recalculateQueue(doctor.id, appointment.date, queryRunner.manager);

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }

    // ── Post-commit side effects ──────────────────────────────────────────────
    this.appointmentGateway?.emitAppointmentEvent(
      SOCKET_EVENTS.CONSULTATION_STARTED,
      {
        appointmentId: appointment!.id,
        patientId:     appointment!.patientId,
        doctorId:      appointment!.doctorId,
        status:        AppointmentStatus.IN_CONSULTATION,
        updatedAt:     appointment!.servedAt!.toISOString(),
      },
    );

    await this.queueService.broadcastQueueStatus(doctor.id, appointment!.date, this.dataSource.manager);

    return {
      success: true,
      message: 'Consultation started successfully',
    };
  }

  // ─── 4. Doctor Complete Appointment ───────────────────────────────────────────

  async completeAppointment(userId: string, appointmentId: string) {
    const doctor = await this.getDoctorByUserId(userId);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    let appointment: Appointment | null = null;
    let nextApp: Appointment | undefined;
    try {
      appointment = await queryRunner.manager
        .createQueryBuilder(Appointment, 'a')
        .where('a.id = :id', { id: appointmentId })
        .setLock('pessimistic_write')
        .getOne();

      if (!appointment) {
        throw new NotFoundException(`Appointment with ID ${appointmentId} not found`);
      }

      if (appointment.doctorId !== doctor.id) {
        throw new ForbiddenException('You are not authorized to manage this appointment');
      }

      if (appointment.status !== AppointmentStatus.IN_CONSULTATION) {
        throw new BadRequestException(
          `Cannot complete appointment. Appointment status is ${appointment.status}, expected IN_CONSULTATION.`,
        );
      }

      // 1. Complete the current appointment
      appointment.status = AppointmentStatus.COMPLETED;
      appointment.completedAt = new Date();
      await queryRunner.manager.save(appointment);

      // 2. Auto trigger moveNextToken (find the next checked-in appointment to serve)
      const checkedInAppointments = await queryRunner.manager
        .createQueryBuilder(Appointment, 'a')
        .where('a.doctorId = :doctorId', { doctorId: doctor.id })
        .andWhere('a.date = :date', { date: appointment.date })
        .andWhere('a.status = :status', { status: AppointmentStatus.CHECKED_IN })
        .setLock('pessimistic_write')
        .getMany();

      if (checkedInAppointments.length > 0) {
        checkedInAppointments.sort((a, b) => {
          const timeA = a.checkedInAt ? new Date(a.checkedInAt).getTime() : 0;
          const timeB = b.checkedInAt ? new Date(b.checkedInAt).getTime() : 0;
          if (timeA !== timeB) return timeA - timeB;

          if (a.tokenNumber !== null && b.tokenNumber !== null) {
            return a.tokenNumber - b.tokenNumber;
          }
          return a.startTime.localeCompare(b.startTime);
        });

        nextApp = checkedInAppointments[0];
        nextApp.status = AppointmentStatus.IN_CONSULTATION;
        nextApp.servedAt = new Date();
        await queryRunner.manager.save(nextApp);
      }

      // 3. Recalculate queue
      await this.queueService.recalculateQueue(doctor.id, appointment.date, queryRunner.manager);

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }

    // ── Post-commit side effects ──────────────────────────────────────────────
    this.appointmentGateway?.emitAppointmentEvent(
      SOCKET_EVENTS.COMPLETED,
      {
        appointmentId: appointment!.id,
        patientId:     appointment!.patientId,
        doctorId:      appointment!.doctorId,
        status:        AppointmentStatus.COMPLETED,
        updatedAt:     appointment!.completedAt!.toISOString(),
      },
    );

    if (nextApp) {
      this.appointmentGateway?.emitAppointmentEvent(
        SOCKET_EVENTS.CONSULTATION_STARTED,
        {
          appointmentId: nextApp.id,
          patientId:     nextApp.patientId,
          doctorId:      nextApp.doctorId,
          status:        AppointmentStatus.IN_CONSULTATION,
          updatedAt:     nextApp.servedAt!.toISOString(),
        },
      );
    }

    await this.queueService.broadcastQueueStatus(doctor.id, appointment!.date, this.dataSource.manager);

    return {
      success: true,
      message: 'Appointment completed successfully',
    };
  }

  // ─── 5. Doctor Mark No Show ───────────────────────────────────────────────────

  async markNoShow(userId: string, appointmentId: string) {
    const doctor = await this.getDoctorByUserId(userId);

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    let appointment: Appointment | null = null;
    try {
      appointment = await queryRunner.manager
        .createQueryBuilder(Appointment, 'a')
        .where('a.id = :id', { id: appointmentId })
        .setLock('pessimistic_write')
        .getOne();

      if (!appointment) {
        throw new NotFoundException(`Appointment with ID ${appointmentId} not found`);
      }

      if (appointment.doctorId !== doctor.id) {
        throw new ForbiddenException('You are not authorized to manage this appointment');
      }

      if (
        appointment.status !== AppointmentStatus.CONFIRMED &&
        appointment.status !== AppointmentStatus.CHECKED_IN
      ) {
        throw new BadRequestException(
          `Cannot mark appointment as no-show. Status is ${appointment.status}, expected CONFIRMED or CHECKED_IN.`,
        );
      }

      const todayStr = getTodayIST();
      if (appointment.date > todayStr) {
        throw new BadRequestException('Cannot mark a future appointment as no-show');
      }

      // Mark status as no-show
      appointment.status = AppointmentStatus.NO_SHOW;
      await queryRunner.manager.save(appointment);

      // Recalculate queue
      await this.queueService.recalculateQueue(doctor.id, appointment.date, queryRunner.manager);

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }

    // ── Post-commit side effects ──────────────────────────────────────────────
    this.appointmentGateway?.emitAppointmentEvent(
      SOCKET_EVENTS.NO_SHOW,
      {
        appointmentId: appointment!.id,
        patientId:     appointment!.patientId,
        doctorId:      appointment!.doctorId,
        status:        AppointmentStatus.NO_SHOW,
        updatedAt:     new Date().toISOString(),
      },
    );

    await this.queueService.broadcastQueueStatus(doctor.id, appointment!.date, this.dataSource.manager);

    return {
      success: true,
      message: 'Appointment marked as no-show successfully',
    };
  }

  // ─── 6. Kiosk QR Scan → Request patient approval (no direct check-in) ────────

  async requestCheckInFromKiosk(appointmentId: string) {
    const appointment = await this.appointmentRepo.findOne({
      where: { id: appointmentId },
      relations: { doctor: true, patient: { user: true } },
    });

    if (!appointment) {
      throw new NotFoundException(`Appointment with ID ${appointmentId} not found`);
    }

    const todayStr = getTodayIST();
    if (appointment.date !== todayStr) {
      throw new BadRequestException(
        'Check-in is only allowed on the appointment date',
      );
    }

    if (appointment.status !== AppointmentStatus.CONFIRMED) {
      throw new BadRequestException(
        `Cannot request check-in. Appointment status is ${appointment.status}`,
      );
    }

    await this.expireStaleRequests(appointment.patientId);

    const existingPending = await this.checkInRequestRepo.findOne({
      where: {
        appointmentId,
        status: CheckInRequestStatus.PENDING,
      },
    });

    if (existingPending && existingPending.expiresAt > new Date()) {
      return {
        success: true,
        message: 'Check-in request already sent. Waiting for patient approval.',
        data: {
          requestId: existingPending.id,
          expiresAt: existingPending.expiresAt.toISOString(),
        },
      };
    }

    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    const request = await this.checkInRequestRepo.save(
      this.checkInRequestRepo.create({
        appointmentId: appointment.id,
        patientId: appointment.patientId,
        status: CheckInRequestStatus.PENDING,
        expiresAt,
      }),
    );

    const title = 'Check-in request at hospital';
    const message = `Someone scanned your QR at the clinic. Approve only if you are at the hospital for Dr. ${appointment.doctor?.fullName ?? 'your doctor'}.`;

    await this.notificationService.createNotification(
      appointment.patientId,
      title,
      message,
      NotificationType.CHECK_IN_REQUEST,
      JSON.stringify({ checkInRequestId: request.id, appointmentId: appointment.id }),
    );

    this.appointmentGateway?.emitCheckInRequest(appointment.patientId, {
      requestId: request.id,
      appointmentId: appointment.id,
      title,
      message,
      expiresAt: expiresAt.toISOString(),
      doctorName: appointment.doctor?.fullName,
      appointmentTime: appointment.startTime,
    });

    return {
      success: true,
      message: 'Check-in request sent to patient. Waiting for approval on their phone.',
      data: {
        requestId: request.id,
        expiresAt: expiresAt.toISOString(),
      },
    };
  }

  async getPendingCheckInRequests(userId: string) {
    const patient = await this.getPatientByUserId(userId);
    await this.expireStaleRequests(patient.id);

    const requests = await this.checkInRequestRepo.find({
      where: {
        patientId: patient.id,
        status: CheckInRequestStatus.PENDING,
      },
      relations: { appointment: { doctor: true } },
      order: { createdAt: 'DESC' },
    });

    const active = requests.filter((r) => r.expiresAt > new Date());

    return {
      success: true,
      message:
        active.length > 0
          ? 'Pending check-in requests retrieved'
          : 'No pending check-in requests',
      data: active.map((r) => ({
        id: r.id,
        appointmentId: r.appointmentId,
        expiresAt: r.expiresAt.toISOString(),
        createdAt: r.createdAt.toISOString(),
        appointment: r.appointment
          ? {
              date: r.appointment.date,
              startTime: r.appointment.startTime,
              endTime: r.appointment.endTime,
              doctorName: r.appointment.doctor?.fullName,
            }
          : null,
      })),
    };
  }

  async approveCheckInRequest(userId: string, requestId: string) {
    const patient = await this.getPatientByUserId(userId);
    const request = await this.getPendingRequestOrFail(requestId, patient.id);

    request.status = CheckInRequestStatus.APPROVED;
    request.respondedAt = new Date();
    await this.checkInRequestRepo.save(request);

    const appointment = await this.appointmentRepo.findOne({
      where: { id: request.appointmentId },
      relations: { doctor: true, patient: { user: true } },
    });

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }

    await this.performCheckIn(appointment);

    return {
      success: true,
      message: 'Check-in approved. You are now in the queue.',
    };
  }

  async rejectCheckInRequest(userId: string, requestId: string) {
    const patient = await this.getPatientByUserId(userId);
    const request = await this.getPendingRequestOrFail(requestId, patient.id);

    request.status = CheckInRequestStatus.REJECTED;
    request.respondedAt = new Date();
    await this.checkInRequestRepo.save(request);

    this.appointmentGateway?.emitCheckInRequest(patient.id, {
      requestId: request.id,
      appointmentId: request.appointmentId,
      title: 'Check-in rejected',
      message: 'You rejected the check-in request.',
      expiresAt: request.expiresAt.toISOString(),
    });

    return {
      success: true,
      message: 'Check-in request rejected. No check-in was performed.',
    };
  }

  private async getPendingRequestOrFail(requestId: string, patientId: string) {
    const request = await this.checkInRequestRepo.findOne({
      where: { id: requestId, patientId },
    });

    if (!request) {
      throw new NotFoundException('Check-in request not found');
    }

    if (request.status !== CheckInRequestStatus.PENDING) {
      throw new BadRequestException('This check-in request is no longer pending');
    }

    if (request.expiresAt <= new Date()) {
      request.status = CheckInRequestStatus.EXPIRED;
      await this.checkInRequestRepo.save(request);
      throw new BadRequestException('Check-in request has expired. Scan QR again at the kiosk.');
    }

    return request;
  }

  private async expireStaleRequests(patientId: string) {
    await this.checkInRequestRepo.update(
      {
        patientId,
        status: CheckInRequestStatus.PENDING,
        expiresAt: LessThan(new Date()),
      },
      { status: CheckInRequestStatus.EXPIRED },
    );
  }
}
