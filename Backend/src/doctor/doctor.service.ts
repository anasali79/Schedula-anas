import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { Doctor } from './entities/doctor.entity';
import {
  CreateDoctorProfileDto,
  UpdateDoctorProfileDto,
} from './dto/doctor-profile.dto';
import { DoctorDiscoveryQueryDto } from './dto/doctor-discovery-query.dto';
import {
  isValidSpecialization,
  normalizeSpecialization,
  VALID_SPECIALIZATIONS,
} from './constants/specializations';
import {
  getAvailabilityStatus,
  isDoctorAvailable,
} from './utils/doctor-availability.util';

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

  async findAll(query: DoctorDiscoveryQueryDto) {
    if (query.specialization && !isValidSpecialization(query.specialization)) {
      throw new BadRequestException(
        `Invalid specialization. Valid values: ${this.getSpecializationList().join(', ')}`,
      );
    }

    const qb = this.doctorRepository.createQueryBuilder('doctor');

    if (query.specialization) {
      qb.andWhere('LOWER(doctor.specialization) = :specialization', {
        specialization: normalizeSpecialization(query.specialization),
      });
    }

    if (query.search) {
      this.applyPartialNameSearch(qb, query.search);
    }

    qb.orderBy('doctor.fullName', 'ASC');

    const doctors = await qb.getMany();
    const filtered = this.applyAvailabilityFilter(doctors, query.availability);
    const total = filtered.length;
    const page = query.page;
    const limit = query.limit;
    const totalPages = total === 0 ? 0 : Math.ceil(total / limit);
    const offset = (page - 1) * limit;
    const paginated = filtered.slice(offset, offset + limit);

    return {
      message:
        total === 0
          ? 'No doctors found matching your criteria'
          : 'Doctors retrieved successfully',
      data: paginated.map((doctor) => this.toDiscoverySummary(doctor)),
      meta: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  async findById(id: string) {
    const doctor = await this.doctorRepository.findOne({ where: { id } });
    if (!doctor) {
      throw new NotFoundException(`Doctor with ID ${id} not found`);
    }

    return {
      message: 'Doctor details retrieved successfully',
      data: this.toDiscoveryDetail(doctor),
    };
  }

  getSpecializationList() {
    return [...VALID_SPECIALIZATIONS];
  }

  private applyPartialNameSearch(
    qb: SelectQueryBuilder<Doctor>,
    search: string,
  ) {
    const terms = search.split(/\s+/).filter(Boolean);

    terms.forEach((term, index) => {
      const param = `searchTerm${index}`;
      qb.andWhere(`doctor.fullName ILIKE :${param}`, {
        [param]: `%${this.escapeLikePattern(term)}%`,
      });
    });
  }

  private escapeLikePattern(value: string): string {
    return value.replace(/[%_\\]/g, '\\$&');
  }

  private applyAvailabilityFilter(
    doctors: Doctor[],
    availability?: boolean,
  ): Doctor[] {
    if (availability === undefined) {
      return doctors;
    }

    return doctors.filter((doctor) =>
      availability
        ? isDoctorAvailable(doctor.consultationHours)
        : !isDoctorAvailable(doctor.consultationHours),
    );
  }

  private toDiscoverySummary(doctor: Doctor) {
    return {
      id: doctor.id,
      fullName: doctor.fullName,
      specialization: doctor.specialization,
      experience: doctor.experience,
      consultationFee: Number(doctor.consultationFee),
      availabilityStatus: getAvailabilityStatus(doctor.consultationHours),
    };
  }

  private toDiscoveryDetail(doctor: Doctor) {
    return {
      ...this.toDiscoverySummary(doctor),
      qualification: doctor.qualification,
      consultationHours: doctor.consultationHours,
      profileDetails: doctor.profileDetails,
      createdAt: doctor.createdAt,
      updatedAt: doctor.updatedAt,
    };
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
