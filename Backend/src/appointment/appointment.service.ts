import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  forwardRef,
  Inject,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Appointment } from './entities/appointment.entity';
import { Doctor } from '../doctor/entities/doctor.entity';
import { Patient } from '../patient/entities/patient.entity';
import { BookAppointmentDto } from './dto/book-appointment.dto';
import { AppointmentStatus } from '../common/enums/appointment-status.enum';
import { AvailabilityService } from '../doctor/availability.service';

@Injectable()
export class AppointmentService {
  constructor(
    @InjectRepository(Appointment)
    private readonly appointmentRepo: Repository<Appointment>,

    @InjectRepository(Doctor)
    private readonly doctorRepo: Repository<Doctor>,

    @InjectRepository(Patient)
    private readonly patientRepo: Repository<Patient>,

    @Inject(forwardRef(() => AvailabilityService))
    private readonly availabilityService: AvailabilityService,
  ) {}

  // ─── 1. Book Appointment ──────────────────────────────────────────────────────

  async bookAppointment(userId: string, dto: BookAppointmentDto) {
    // 1. Find the patient profile for this user
    const patient = await this.patientRepo.findOne({ where: { userId } });
    if (!patient) {
      throw new NotFoundException(
        'Patient profile not found. Please create your profile first.',
      );
    }

    // 2. Verify doctor exists
    const doctor = await this.doctorRepo.findOne({
      where: { id: dto.doctorId },
    });
    if (!doctor) {
      throw new NotFoundException(
        `Doctor with ID ${dto.doctorId} not found`,
      );
    }

    // 3. Validate date is not in the past
    this.validateFutureDateTime(dto.date, dto.startTime);

    // 4. Validate the slot exists in doctor's availability
    await this.validateSlotExists(dto.doctorId, dto.date, dto.startTime, dto.endTime);

    // 5. Check if the slot is already booked (duplicate booking prevention)
    const existingBooking = await this.appointmentRepo.findOne({
      where: {
        doctorId: dto.doctorId,
        date: dto.date,
        startTime: dto.startTime,
        endTime: dto.endTime,
        status: AppointmentStatus.BOOKED,
      },
    });

    if (existingBooking) {
      throw new ConflictException(
        `This slot (${dto.startTime} - ${dto.endTime}) on ${dto.date} is already booked`,
      );
    }

    // 5.5 Calculate token number
    const maxTokenResult = await this.appointmentRepo
      .createQueryBuilder('appointment')
      .select('MAX(appointment.tokenNumber)', 'max')
      .where('appointment.doctorId = :doctorId', { doctorId: dto.doctorId })
      .andWhere('appointment.date = :date', { date: dto.date })
      .getRawOne();
      
    const currentMax = maxTokenResult.max ? parseInt(maxTokenResult.max, 10) : 0;
    const tokenNumber = currentMax + 1;

    // 6. Create the appointment
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

    // Re-fetch with relations for response
    const fullAppointment = await this.appointmentRepo.findOne({
      where: { id: saved.id },
      relations: { doctor: true, patient: true },
    });

    return {
      message: 'Appointment booked successfully',
      data: this.toPatientAppointmentResponse(fullAppointment!),
    };
  }

  // ─── 2. Patient Appointment View ──────────────────────────────────────────────

  async getPatientAppointments(userId: string) {
    const patient = await this.patientRepo.findOne({ where: { userId } });
    if (!patient) {
      throw new NotFoundException(
        'Patient profile not found. Please create your profile first.',
      );
    }

    const appointments = await this.appointmentRepo.find({
      where: { patientId: patient.id },
      relations: { doctor: true },
      order: { date: 'DESC', startTime: 'DESC' },
    });

    if (appointments.length === 0) {
      return {
        message: 'No appointments found',
        data: [],
      };
    }

    return {
      message: 'Appointments retrieved successfully',
      data: appointments.map((appt) => this.toPatientAppointmentResponse(appt)),
    };
  }

  // ─── 3. Cancel Appointment ────────────────────────────────────────────────────

  async cancelAppointment(userId: string, appointmentId: string) {
    const patient = await this.patientRepo.findOne({ where: { userId } });
    if (!patient) {
      throw new NotFoundException(
        'Patient profile not found. Please create your profile first.',
      );
    }

    // Find appointment
    const appointment = await this.appointmentRepo.findOne({
      where: { id: appointmentId },
      relations: { doctor: true, patient: true },
    });

    if (!appointment) {
      throw new NotFoundException(
        `Appointment with ID ${appointmentId} not found`,
      );
    }

    // Only appointment owner can cancel
    if (appointment.patientId !== patient.id) {
      throw new ForbiddenException(
        'Access denied: You can only cancel your own appointments',
      );
    }

    // Cannot cancel already cancelled appointment
    if (appointment.status === AppointmentStatus.CANCELLED) {
      throw new BadRequestException(
        'This appointment is already cancelled',
      );
    }

    // Cannot cancel past appointments
    this.validateNotPastAppointment(appointment.date, appointment.startTime);

    // Cancel the appointment
    appointment.status = AppointmentStatus.CANCELLED;
    const saved = await this.appointmentRepo.save(appointment);

    return {
      message: 'Appointment cancelled successfully',
      data: this.toPatientAppointmentResponse(saved),
    };
  }

  // ─── 4. Doctor Appointment View ───────────────────────────────────────────────

  async getDoctorAppointments(userId: string) {
    const doctor = await this.doctorRepo.findOne({ where: { userId } });
    if (!doctor) {
      throw new NotFoundException(
        'Doctor profile not found. Please create your profile first.',
      );
    }

    const appointments = await this.appointmentRepo.find({
      where: { doctorId: doctor.id },
      relations: { patient: true },
      order: { date: 'DESC', startTime: 'DESC' },
    });

    if (appointments.length === 0) {
      return {
        message: 'No appointments found',
        data: [],
      };
    }

    return {
      message: 'Appointments retrieved successfully',
      data: appointments.map((appt) => this.toDoctorAppointmentResponse(appt)),
    };
  }

  // ─── 5. Patient Dashboard Stats ───────────────────────────────────────────────

  async getPatientDashboardStats(userId: string) {
    const patient = await this.patientRepo.findOne({ where: { userId } });
    if (!patient) {
      throw new NotFoundException('Patient profile not found. Please create your profile first.');
    }

    const now = new Date();
    const todayStr = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;

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
      upcomingAppointments,
      pastAppointments,
      prescriptions: 0,
    };
  }

  // ─── Private Helpers ──────────────────────────────────────────────────────────

  /**
   * Validate that the appointment date/time is in the future.
   */
  private validateFutureDateTime(date: string, startTime: string): void {
    const now = new Date();

    // Build "today" string in YYYY-MM-DD from local time
    const todayStr = `${now.getFullYear()}-${(now.getMonth() + 1)
      .toString()
      .padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;

    if (date < todayStr) {
      throw new BadRequestException(
        'Cannot book appointment for a past date',
      );
    }

    // If booking for today, check if the startTime hasn't already passed
    if (date === todayStr) {
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      const [h, m] = startTime.split(':').map(Number);
      const slotMinutes = h * 60 + m;

      if (slotMinutes <= currentMinutes) {
        throw new BadRequestException(
          'Cannot book appointment for a past time slot',
        );
      }
    }
  }

  /**
   * Validate that the given slot exists in the doctor's available slots.
   * This reuses the AvailabilityService to get all available (non-booked) slots
   * and checks if the requested slot is among them.
   */
  private async validateSlotExists(
    doctorId: string,
    date: string,
    startTime: string,
    endTime: string,
  ): Promise<void> {
    try {
      // Get available slots (this already filters out booked ones)
      const availableSlots = await this.availabilityService.getAvailableSlots(
        doctorId,
        date,
      );

      const validStatuses = ['available', 'cancel and available for booking'];

      const slotExists = availableSlots.some(
        (slot) => slot.startTime === startTime && slot.endTime === endTime && validStatuses.includes(slot.status),
      );

      if (!slotExists) {
        throw new BadRequestException(
          `Slot ${startTime} - ${endTime} is not available for this doctor on ${date}`,
        );
      }
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      // NotFoundException from getAvailableSlots means no availability
      if (error instanceof NotFoundException) {
        throw new BadRequestException(
          `No available slots found for this doctor on ${date}`,
        );
      }
      throw error;
    }
  }

  /**
   * Validate that the appointment has not already passed (for cancellation).
   */
  private validateNotPastAppointment(date: string, startTime: string): void {
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${(now.getMonth() + 1)
      .toString()
      .padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;

    if (date < todayStr) {
      throw new BadRequestException(
        'Cannot cancel a past appointment',
      );
    }

    if (date === todayStr) {
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      const [h, m] = startTime.split(':').map(Number);
      const slotMinutes = h * 60 + m;

      if (slotMinutes <= currentMinutes) {
        throw new BadRequestException(
          'Cannot cancel a past appointment',
        );
      }
    }
  }

  /**
   * Format appointment for patient view (includes doctor details).
   */
  private toPatientAppointmentResponse(appointment: Appointment) {
    return {
      id: appointment.id,
      date: appointment.date,
      startTime: appointment.startTime,
      endTime: appointment.endTime,
      status: appointment.status,
      tokenNumber: appointment.tokenNumber,
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

  /**
   * Format appointment for doctor view (includes patient details).
   */
  private toDoctorAppointmentResponse(appointment: Appointment) {
    return {
      id: appointment.id,
      date: appointment.date,
      startTime: appointment.startTime,
      endTime: appointment.endTime,
      status: appointment.status,
      tokenNumber: appointment.tokenNumber,
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
