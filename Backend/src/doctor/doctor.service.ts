import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Doctor } from './entities/doctor.entity';
import {
  CreateDoctorProfileDto,
  UpdateDoctorProfileDto,
} from './dto/doctor-profile.dto';

@Injectable()
export class DoctorService {
  constructor(
    @InjectRepository(Doctor)
    private readonly doctorRepository: Repository<Doctor>,
  ) {}

  async createProfile(userId: string, dto: CreateDoctorProfileDto) {
    const existing = await this.doctorRepository.findOne({ where: { userId } });
    if (existing) {
      throw new ConflictException('Doctor profile already exists');
    }

    const profile = this.doctorRepository.create({ userId, ...dto });
    const saved = await this.doctorRepository.save(profile);
    return this.toResponse(saved);
  }

  async getProfile(userId: string) {
    const profile = await this.findByUserIdOrFail(userId);
    return this.toResponse(profile);
  }

  async updateProfile(userId: string, dto: UpdateDoctorProfileDto) {
    const profile = await this.findByUserIdOrFail(userId);
    Object.assign(profile, dto);
    const saved = await this.doctorRepository.save(profile);
    return this.toResponse(saved);
  }

  private async findByUserIdOrFail(userId: string): Promise<Doctor> {
    const profile = await this.doctorRepository.findOne({ where: { userId } });
    if (!profile) {
      throw new NotFoundException('Doctor profile not found');
    }
    return profile;
  }

  private toResponse(profile: Doctor) {
    return {
      id: profile.id,
      userId: profile.userId,
      fullName: profile.fullName,
      specialization: profile.specialization,
      experience: profile.experience,
      qualification: profile.qualification,
      consultationFee: Number(profile.consultationFee),
      consultationHours: profile.consultationHours,
      profileDetails: profile.profileDetails,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
    };
  }
}
