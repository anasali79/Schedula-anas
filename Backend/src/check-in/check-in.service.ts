import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Appointment } from '../appointment/entities/appointment.entity';
import { Doctor } from '../doctor/entities/doctor.entity';
import { Patient } from '../patient/entities/patient.entity';
import { AppointmentStatus } from '../common/enums/appointment-status.enum';
import { getTodayIST } from '../common/utils/appointment.utils';
import { AppointmentGateway, SOCKET_EVENTS } from '../sockets/appointment.gateway';

@Injectable()
export class CheckInService {
  constructor(
    @InjectRepository(Appointment)
    private readonly appointmentRepo: Repository<Appointment>,

    @InjectRepository(Doctor)
    private readonly doctorRepo: Repository<Doctor>,

    @InjectRepository(Patient)
    private readonly patientRepo: Repository<Patient>,

    @Optional()
    private readonly appointmentGateway: AppointmentGateway,
  ) {}

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

    // ── Atomic update — race condition protection ─────────────────────────────
    // Only update if status is still CONFIRMED; prevents duplicate check-ins
    // from concurrent requests (e.g. double QR scan, network retry).
    const result = await this.appointmentRepo
      .createQueryBuilder()
      .update(Appointment)
      .set({
        status: AppointmentStatus.CHECKED_IN,
        checkedInAt: new Date(),
      })
      .where('id = :id', { id: appointment.id })
      .andWhere('status = :status', { status: AppointmentStatus.CONFIRMED })
      .execute();

    if (!result.affected || result.affected === 0) {
      // A concurrent request already checked in — treat as duplicate
      throw new ConflictException('Patient already checked in');
    }

    // ── Emit real-time Socket.IO event ───────────────────────────────────────
    this.appointmentGateway?.emitAppointmentEvent(
      SOCKET_EVENTS.CHECKED_IN,
      {
        appointmentId: appointment.id,
        patientId:     appointment.patientId,
        doctorId:      appointment.doctorId,
        status:        AppointmentStatus.CHECKED_IN,
        updatedAt:     new Date().toISOString(),
      },
    );

    return {
      success: true,
      message: 'Checked in successfully',
    };
  }

  // ─── 3. Doctor Start Consultation ─────────────────────────────────────────────

  async startConsultation(userId: string, appointmentId: string) {
    const doctor = await this.getDoctorByUserId(userId);

    const appointment = await this.appointmentRepo.findOne({
      where: { id: appointmentId },
    });

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

    const result = await this.appointmentRepo
      .createQueryBuilder()
      .update(Appointment)
      .set({ status: AppointmentStatus.IN_CONSULTATION })
      .where('id = :id', { id: appointment.id })
      .andWhere('status = :status', { status: AppointmentStatus.CHECKED_IN })
      .execute();

    if (!result.affected || result.affected === 0) {
      throw new ConflictException('Failed to start consultation: status might have changed.');
    }

    // ── Emit real-time Socket.IO event ───────────────────────────────────────
    this.appointmentGateway?.emitAppointmentEvent(
      SOCKET_EVENTS.CONSULTATION_STARTED,
      {
        appointmentId: appointment.id,
        patientId:     appointment.patientId,
        doctorId:      appointment.doctorId,
        status:        AppointmentStatus.IN_CONSULTATION,
        updatedAt:     new Date().toISOString(),
      },
    );

    return {
      success: true,
      message: 'Consultation started successfully',
    };
  }

  // ─── 4. Doctor Complete Appointment ───────────────────────────────────────────

  async completeAppointment(userId: string, appointmentId: string) {
    const doctor = await this.getDoctorByUserId(userId);

    const appointment = await this.appointmentRepo.findOne({
      where: { id: appointmentId },
    });

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

    const result = await this.appointmentRepo
      .createQueryBuilder()
      .update(Appointment)
      .set({ status: AppointmentStatus.COMPLETED })
      .where('id = :id', { id: appointment.id })
      .andWhere('status = :status', { status: AppointmentStatus.IN_CONSULTATION })
      .execute();

    if (!result.affected || result.affected === 0) {
      throw new ConflictException('Failed to complete appointment: status might have changed.');
    }

    // ── Emit real-time Socket.IO event ───────────────────────────────────────
    this.appointmentGateway?.emitAppointmentEvent(
      SOCKET_EVENTS.COMPLETED,
      {
        appointmentId: appointment.id,
        patientId:     appointment.patientId,
        doctorId:      appointment.doctorId,
        status:        AppointmentStatus.COMPLETED,
        updatedAt:     new Date().toISOString(),
      },
    );

    return {
      success: true,
      message: 'Appointment completed successfully',
    };
  }

  // ─── 5. Doctor Mark No Show ───────────────────────────────────────────────────

  async markNoShow(userId: string, appointmentId: string) {
    const doctor = await this.getDoctorByUserId(userId);

    const appointment = await this.appointmentRepo.findOne({
      where: { id: appointmentId },
    });

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

    const result = await this.appointmentRepo
      .createQueryBuilder()
      .update(Appointment)
      .set({ status: AppointmentStatus.NO_SHOW })
      .where('id = :id', { id: appointment.id })
      .andWhere('status IN (:...statuses)', {
        statuses: [AppointmentStatus.CONFIRMED, AppointmentStatus.CHECKED_IN],
      })
      .execute();

    if (!result.affected || result.affected === 0) {
      throw new ConflictException('Failed to mark as no-show: status might have changed.');
    }

    // ── Emit real-time Socket.IO event ───────────────────────────────────────
    this.appointmentGateway?.emitAppointmentEvent(
      SOCKET_EVENTS.NO_SHOW,
      {
        appointmentId: appointment.id,
        patientId:     appointment.patientId,
        doctorId:      appointment.doctorId,
        status:        AppointmentStatus.NO_SHOW,
        updatedAt:     new Date().toISOString(),
      },
    );

    return {
      success: true,
      message: 'Appointment marked as no-show successfully',
    };
  }
}
