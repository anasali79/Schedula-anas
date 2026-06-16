import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Patient } from './entities/patient.entity';
import {
  CreatePatientProfileDto,
  UpdatePatientProfileDto,
} from './dto/patient-profile.dto';

@Injectable()
export class PatientService {
  constructor(
    @InjectRepository(Patient)
    private readonly patientRepository: Repository<Patient>,
  ) {}

  async createProfile(userId: string, dto: CreatePatientProfileDto) {
    const existing = await this.patientRepository.findOne({
      where: { userId },
    });
    if (existing) {
      throw new ConflictException('Patient profile already exists');
    }

    const profile = this.patientRepository.create({ userId, ...dto });
    const saved = await this.patientRepository.save(profile);
    return this.toResponse(saved);
  }

  async getProfile(userId: string) {
    const profile = await this.findByUserIdOrFail(userId);
    return this.toResponse(profile);
  }

  async updateProfile(userId: string, dto: UpdatePatientProfileDto) {
    const profile = await this.findByUserIdOrFail(userId);
    Object.assign(profile, dto);
    const saved = await this.patientRepository.save(profile);
    return this.toResponse(saved);
  }

  private async findByUserIdOrFail(userId: string): Promise<Patient> {
    const profile = await this.patientRepository.findOne({ where: { userId } });
    if (!profile) {
      throw new NotFoundException('Patient profile not found');
    }
    return profile;
  }

  private toResponse(profile: Patient) {
    return {
      id: profile.id,
      userId: profile.userId,
      fullName: profile.fullName,
      age: profile.age,
      gender: profile.gender,
      contactDetails: {
        phone: profile.phone,
        address: profile.address,
      },
      basicHealthInfo: profile.basicHealthInfo,
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
    };
  }
}
