import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, In } from 'typeorm';
import { DoctorLeave } from './entities/leave.entity';
import { Doctor } from './entities/doctor.entity';
import { Appointment } from '../appointment/entities/appointment.entity';
import { AppointmentStatus } from '../common/enums/appointment-status.enum';
import { CreateLeaveDto, UpdateLeaveDto } from './dto/leave.dto';
import { getTodayIST } from '../common/utils/appointment.utils';

@Injectable()
export class LeaveService {
  constructor(
    @InjectRepository(DoctorLeave)
    private readonly leaveRepo: Repository<DoctorLeave>,

    @InjectRepository(Doctor)
    private readonly doctorRepo: Repository<Doctor>,

    @InjectRepository(Appointment)
    private readonly appointmentRepo: Repository<Appointment>,
  ) {}

  private async findDoctorByUserIdOrFail(userId: string): Promise<Doctor> {
    const doctor = await this.doctorRepo.findOne({ where: { userId } });
    if (!doctor) {
      throw new NotFoundException('Doctor profile not found. Please create your profile first.');
    }
    return doctor;
  }

  async getLeaves(userId: string): Promise<DoctorLeave[]> {
    const doctor = await this.findDoctorByUserIdOrFail(userId);
    return this.leaveRepo.find({
      where: { doctorId: doctor.id },
      order: { date: 'ASC' },
    });
  }

  async createLeave(userId: string, dto: CreateLeaveDto): Promise<DoctorLeave> {
    const doctor = await this.findDoctorByUserIdOrFail(userId);
    const todayStr = getTodayIST();

    // Past date check
    if (dto.date < todayStr) {
      throw new BadRequestException('Cannot apply leave for a past date');
    }

    // Duplicate leave check
    const existing = await this.leaveRepo.findOne({
      where: { doctorId: doctor.id, date: dto.date },
    });
    if (existing) {
      throw new BadRequestException('Leave is already applied for this date');
    }

    // Existing appointments check
    const hasAppointments = await this.appointmentRepo.findOne({
      where: {
        doctorId: doctor.id,
        date: dto.date,
        status: Not(In([AppointmentStatus.CANCELLED, AppointmentStatus.RESCHEDULED])),
      },
    });
    if (hasAppointments) {
      throw new BadRequestException(
        'Cannot apply leave. Appointments are already scheduled on this date. Please cancel or reschedule existing appointments first.',
      );
    }

    const leave = this.leaveRepo.create({
      doctorId: doctor.id,
      date: dto.date,
      reason: dto.reason ?? null,
    });

    return this.leaveRepo.save(leave);
  }

  async updateLeave(userId: string, id: string, dto: UpdateLeaveDto): Promise<DoctorLeave> {
    const doctor = await this.findDoctorByUserIdOrFail(userId);
    const leave = await this.leaveRepo.findOne({ where: { id } });
    if (!leave) {
      throw new NotFoundException(`Leave with ID ${id} not found`);
    }

    if (leave.doctorId !== doctor.id) {
      throw new ForbiddenException('Access denied: You can only update your own leave');
    }

    const todayStr = getTodayIST();

    if (dto.date && dto.date !== leave.date) {
      // Past date check
      if (dto.date < todayStr) {
        throw new BadRequestException('Cannot apply leave for a past date');
      }

      // Duplicate leave check
      const existing = await this.leaveRepo.findOne({
        where: { doctorId: doctor.id, date: dto.date },
      });
      if (existing) {
        throw new BadRequestException('Leave is already applied for this date');
      }

      // Existing appointments check
      const hasAppointments = await this.appointmentRepo.findOne({
        where: {
          doctorId: doctor.id,
          date: dto.date,
          status: Not(In([AppointmentStatus.CANCELLED, AppointmentStatus.RESCHEDULED])),
        },
      });
      if (hasAppointments) {
        throw new BadRequestException(
          'Cannot apply leave. Appointments are already scheduled on this date. Please cancel or reschedule existing appointments first.',
        );
      }

      leave.date = dto.date;
    }

    if (dto.reason !== undefined) {
      leave.reason = dto.reason ?? null;
    }

    return this.leaveRepo.save(leave);
  }

  async deleteLeave(userId: string, id: string): Promise<void> {
    const doctor = await this.findDoctorByUserIdOrFail(userId);
    const leave = await this.leaveRepo.findOne({ where: { id } });
    if (!leave) {
      throw new NotFoundException(`Leave with ID ${id} not found`);
    }

    if (leave.doctorId !== doctor.id) {
      throw new ForbiddenException('Access denied: You can only delete your own leave');
    }

    await this.leaveRepo.remove(leave);
  }
}
