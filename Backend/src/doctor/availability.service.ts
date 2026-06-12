import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  RecurringAvailability,
  DayOfWeek,
} from './entities/recurring-availability.entity';
import { CustomAvailability } from './entities/custom-availability.entity';
import { Doctor } from './entities/doctor.entity';
import {
  CreateRecurringAvailabilityDto,
  UpdateRecurringAvailabilityDto,
  CreateCustomAvailabilityDto,
} from './dto/availability.dto';

// Helper: Convert "HH:MM" to total minutes for easy comparison
function toMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

// Helper: Check if two time ranges overlap
function timesOverlap(
  start1: string,
  end1: string,
  start2: string,
  end2: string,
): boolean {
  const s1 = toMinutes(start1);
  const e1 = toMinutes(end1);
  const s2 = toMinutes(start2);
  const e2 = toMinutes(end2);
  // Overlap exists if one starts before the other ends
  return s1 < e2 && s2 < e1;
}

// Helper: Map YYYY-MM-DD date string to DayOfWeek enum
function getDayOfWeekFromDate(dateStr: string): DayOfWeek {
  const date = new Date(dateStr + 'T00:00:00'); // Prevent timezone shift
  const jsDay = date.getDay(); // 0=Sunday, 1=Monday...
  const map: Record<number, DayOfWeek> = {
    0: DayOfWeek.SUNDAY,
    1: DayOfWeek.MONDAY,
    2: DayOfWeek.TUESDAY,
    3: DayOfWeek.WEDNESDAY,
    4: DayOfWeek.THURSDAY,
    5: DayOfWeek.FRIDAY,
    6: DayOfWeek.SATURDAY,
  };
  return map[jsDay];
}

@Injectable()
export class AvailabilityService {
  constructor(
    @InjectRepository(RecurringAvailability)
    private readonly recurringRepo: Repository<RecurringAvailability>,

    @InjectRepository(CustomAvailability)
    private readonly customRepo: Repository<CustomAvailability>,

    @InjectRepository(Doctor)
    private readonly doctorRepo: Repository<Doctor>,
  ) {}

  // ─── Recurring Availability ──────────────────────────────────────────────────

  async createRecurring(
    userId: string,
    dto: CreateRecurringAvailabilityDto,
  ): Promise<RecurringAvailability> {
    const doctor = await this.findDoctorByUserIdOrFail(userId);

    // Validate: endTime must be after startTime
    this.validateTimeRange(dto.startTime, dto.endTime);

    // Check for overlap with existing slots on the same day
    const existingSlots = await this.recurringRepo.find({
      where: { doctorId: doctor.id, dayOfWeek: dto.dayOfWeek },
    });

    this.checkRecurringOverlap(existingSlots, dto.startTime, dto.endTime);

    // Check for exact duplicate
    const duplicate = existingSlots.find(
      (s) => s.startTime === dto.startTime && s.endTime === dto.endTime,
    );
    if (duplicate) {
      throw new ConflictException(
        `A slot already exists for ${dto.dayOfWeek} from ${dto.startTime} to ${dto.endTime}`,
      );
    }

    const slot = this.recurringRepo.create({
      doctorId: doctor.id,
      dayOfWeek: dto.dayOfWeek,
      startTime: dto.startTime,
      endTime: dto.endTime,
    });

    return this.recurringRepo.save(slot);
  }

  async getRecurring(userId: string): Promise<RecurringAvailability[]> {
    const doctor = await this.findDoctorByUserIdOrFail(userId);
    return this.recurringRepo.find({
      where: { doctorId: doctor.id },
      order: { dayOfWeek: 'ASC', startTime: 'ASC' },
    });
  }

  async getDetailedAvailability(userId: string): Promise<{
    doctorId: string;
    recurring: RecurringAvailability[];
    customOverrides: Array<CustomAvailability & { dayOfWeek: DayOfWeek }>;
    generatedSchedule: Array<{
      date: string;
      dayOfWeek: DayOfWeek;
      source: 'custom' | 'recurring' | 'none';
      slots: Array<{ id: string; startTime: string; endTime: string }>;
    }>;
  }> {
    const doctor = await this.findDoctorByUserIdOrFail(userId);

    // 1. Get raw recurring templates
    const recurring = await this.recurringRepo.find({
      where: { doctorId: doctor.id },
      order: { dayOfWeek: 'ASC', startTime: 'ASC' },
    });

    // Determine range: 30 days starting from today
    const today = new Date();
    const startDateStr = today.toISOString().split('T')[0];
    const maxDate = new Date();
    maxDate.setDate(today.getDate() + 29);
    const endDateStr = maxDate.toISOString().split('T')[0];

    // 2. Fetch all custom overrides within these 30 days
    const customOverrides = await this.customRepo.createQueryBuilder('ca')
      .where('ca.doctorId = :doctorId', { doctorId: doctor.id })
      .andWhere('ca.date >= :startDate', { startDate: startDateStr })
      .andWhere('ca.date <= :endDate', { endDate: endDateStr })
      .orderBy('ca.date', 'ASC')
      .addOrderBy('ca.startTime', 'ASC')
      .getMany();

    // Map custom overrides by date for instant lookup, filtering out blockouts from schedule
    const customMap: Record<
      string,
      {
        slots: Array<{ id: string; startTime: string; endTime: string }>;
        hasBlockout: boolean;
      }
    > = {};

    for (const override of customOverrides) {
      if (!customMap[override.date]) {
        customMap[override.date] = { slots: [], hasBlockout: false };
      }
      if (override.startTime === '00:00' && override.endTime === '00:00') {
        customMap[override.date].hasBlockout = true;
      } else {
        customMap[override.date].slots.push({
          id: override.id,
          startTime: override.startTime,
          endTime: override.endTime,
        });
      }
    }

    // 3. Generate calendar schedule for next 30 days
    const generatedSchedule: Array<{
      date: string;
      dayOfWeek: DayOfWeek;
      source: 'custom' | 'recurring' | 'none';
      slots: Array<{ id: string; startTime: string; endTime: string }>;
    }> = [];

    for (let i = 0; i < 30; i++) {
      const currentDate = new Date(today);
      currentDate.setDate(today.getDate() + i);
      const dateStr = currentDate.toISOString().split('T')[0];
      const dayOfWeek = getDayOfWeekFromDate(dateStr);

      // Check if custom override exists for this exact date
      if (customMap[dateStr]) {
        generatedSchedule.push({
          date: dateStr,
          dayOfWeek,
          source: 'custom',
          slots: customMap[dateStr].slots,
        });
      } else {
        // Fall back to recurring availability for this day of week
        const dateRecurringSlots = recurring.filter(r => r.dayOfWeek === dayOfWeek);
        if (dateRecurringSlots.length > 0) {
          generatedSchedule.push({
            date: dateStr,
            dayOfWeek,
            source: 'recurring',
            slots: dateRecurringSlots.map(s => ({
              id: s.id,
              startTime: s.startTime,
              endTime: s.endTime,
            })),
          });
        } else {
          generatedSchedule.push({
            date: dateStr,
            dayOfWeek,
            source: 'none',
            slots: [],
          });
        }
      }
    }

    const customOverridesWithDay = customOverrides.map((override) => ({
      ...override,
      dayOfWeek: getDayOfWeekFromDate(override.date),
    }));

    return {
      doctorId: doctor.id,
      recurring,
      customOverrides: customOverridesWithDay,
      generatedSchedule,
    };
  }

  async cancelOccurrence(
    userId: string,
    date: string,
    startTime: string,
    endTime: string,
  ): Promise<void> {
    const doctor = await this.findDoctorByUserIdOrFail(userId);
    const dayOfWeek = getDayOfWeekFromDate(date);

    // 1. Check if there are already custom overrides for this date
    const customSlots = await this.customRepo.find({
      where: { doctorId: doctor.id, date },
    });

    if (customSlots.length > 0) {
      // Case A: Custom overrides exist.
      // If we find the specific slot, delete it.
      const match = customSlots.find(
        (s) => s.startTime === startTime && s.endTime === endTime,
      );
      if (match) {
        await this.customRepo.remove(match);
        
        // If that was the only custom slot, and we removed it, we need to make sure
        // it doesn't just fallback to recurring slots! So we insert a blockout slot.
        // We do this if there are no other custom slots left for this date.
        const remainingCustomCount = customSlots.filter(s => s.id !== match.id).length;
        if (remainingCustomCount === 0) {
          const blockout = this.customRepo.create({
            doctorId: doctor.id,
            date,
            startTime: '00:00',
            endTime: '00:00',
          });
          await this.customRepo.save(blockout);
        }
      } else {
        throw new NotFoundException(`Slot ${startTime}-${endTime} not found on custom overrides for ${date}`);
      }
    } else {
      // Case B: No custom overrides exist yet.
      // We must copy the recurring slots for this day, EXCEPT the one being cancelled.
      const recurringSlots = await this.recurringRepo.find({
        where: { doctorId: doctor.id, dayOfWeek },
      });

      const remainingSlots = recurringSlots.filter(
        (s) => !(s.startTime === startTime && s.endTime === endTime),
      );

      if (remainingSlots.length === recurringSlots.length) {
        throw new NotFoundException(
          `No matching slot found to cancel on ${date} (Day: ${dayOfWeek})`,
        );
      }

      if (remainingSlots.length > 0) {
        // Save remaining slots as custom overrides
        const newCustoms = remainingSlots.map((s) =>
          this.customRepo.create({
            doctorId: doctor.id,
            date,
            startTime: s.startTime,
            endTime: s.endTime,
          }),
        );
        await this.customRepo.save(newCustoms);
      } else {
        // No slots remaining -> doctor wants to be completely unavailable.
        // Save a blockout slot.
        const blockout = this.customRepo.create({
          doctorId: doctor.id,
          date,
          startTime: '00:00',
          endTime: '00:00',
        });
        await this.customRepo.save(blockout);
      }
    }
  }

  async updateRecurring(
    userId: string,
    id: string,
    dto: UpdateRecurringAvailabilityDto,
  ): Promise<RecurringAvailability> {
    const doctor = await this.findDoctorByUserIdOrFail(userId);
    const slot = await this.findRecurringSlotOrFail(id, doctor.id);

    const updatedDay = dto.dayOfWeek ?? slot.dayOfWeek;
    const updatedStart = dto.startTime ?? slot.startTime;
    const updatedEnd = dto.endTime ?? slot.endTime;

    // Validate time range
    this.validateTimeRange(updatedStart, updatedEnd);

    // Get all OTHER slots for that day (excluding current)
    const existingSlots = await this.recurringRepo
      .createQueryBuilder('ra')
      .where('ra.doctorId = :doctorId', { doctorId: doctor.id })
      .andWhere('ra.dayOfWeek = :day', { day: updatedDay })
      .andWhere('ra.id != :id', { id })
      .getMany();

    this.checkRecurringOverlap(existingSlots, updatedStart, updatedEnd);

    // Check for exact duplicate excluding self
    const duplicate = existingSlots.find(
      (s) => s.startTime === updatedStart && s.endTime === updatedEnd,
    );
    if (duplicate) {
      throw new ConflictException(
        `A slot already exists for ${updatedDay} from ${updatedStart} to ${updatedEnd}`,
      );
    }

    Object.assign(slot, {
      dayOfWeek: updatedDay,
      startTime: updatedStart,
      endTime: updatedEnd,
    });

    return this.recurringRepo.save(slot);
  }

  async deleteRecurring(userId: string, id: string): Promise<void> {
    const doctor = await this.findDoctorByUserIdOrFail(userId);
    const slot = await this.findRecurringSlotOrFail(id, doctor.id);
    await this.recurringRepo.remove(slot);
  }

  // ─── Custom Availability (Override) ─────────────────────────────────────────

  async createCustomOverride(
    userId: string,
    dto: CreateCustomAvailabilityDto,
  ): Promise<CustomAvailability> {
    const doctor = await this.findDoctorByUserIdOrFail(userId);

    // Validate: endTime must be after startTime
    this.validateTimeRange(dto.startTime, dto.endTime);

    // Validate: date must not be in the past
    this.validateDateNotPast(dto.date);

    // Check overlap with existing custom slots for the same date
    const existingSlots = await this.customRepo.find({
      where: { doctorId: doctor.id, date: dto.date },
    });

    this.checkCustomOverlap(existingSlots, dto.startTime, dto.endTime);

    // Check exact duplicate
    const duplicate = existingSlots.find(
      (s) => s.startTime === dto.startTime && s.endTime === dto.endTime,
    );
    if (duplicate) {
      throw new ConflictException(
        `A custom slot already exists for ${dto.date} from ${dto.startTime} to ${dto.endTime}`,
      );
    }

    const slot = this.customRepo.create({
      doctorId: doctor.id,
      date: dto.date,
      startTime: dto.startTime,
      endTime: dto.endTime,
    });

    return this.customRepo.save(slot);
  }

  async getAvailabilityByDate(
    doctorId: string,
    date: string,
  ): Promise<{
    date: string;
    dayOfWeek: DayOfWeek;
    source: 'custom' | 'recurring' | 'none';
    slots: Array<{ startTime: string; endTime: string }>;
  }> {
    const cleanDate = date.trim().replace(/\/$/, '');

    // Validate date format
    if (!/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(cleanDate)) {
      throw new BadRequestException(
        'date must be in YYYY-MM-DD format, e.g. "2026-06-15"',
      );
    }

    const doctor = await this.doctorRepo.findOne({ where: { id: doctorId } });
    if (!doctor) {
      throw new NotFoundException(`Doctor with ID ${doctorId} not found`);
    }

    const dayOfWeek = getDayOfWeekFromDate(cleanDate);

    // 1. Check custom overrides first (highest priority)
    const customSlots = await this.customRepo.find({
      where: { doctorId, date: cleanDate },
      order: { startTime: 'ASC' },
    });

    if (customSlots.length > 0) {
      return {
        date: cleanDate,
        dayOfWeek,
        source: 'custom',
        slots: customSlots.map((s) => ({
          startTime: s.startTime,
          endTime: s.endTime,
        })),
      };
    }

    // 2. Fall back to recurring availability
    const recurringSlots = await this.recurringRepo.find({
      where: { doctorId, dayOfWeek },
      order: { startTime: 'ASC' },
    });

    if (recurringSlots.length > 0) {
      return {
        date: cleanDate,
        dayOfWeek,
        source: 'recurring',
        slots: recurringSlots.map((s) => ({
          startTime: s.startTime,
          endTime: s.endTime,
        })),
      };
    }

    return {
      date: cleanDate,
      dayOfWeek,
      source: 'none',
      slots: [],
    };
  }

  // ─── Private Helpers ─────────────────────────────────────────────────────────

  private async findDoctorByUserIdOrFail(userId: string): Promise<Doctor> {
    const doctor = await this.doctorRepo.findOne({ where: { userId } });
    if (!doctor) {
      throw new NotFoundException(
        'Doctor profile not found. Please create your profile first.',
      );
    }
    return doctor;
  }

  private async findRecurringSlotOrFail(
    id: string,
    doctorId: string,
  ): Promise<RecurringAvailability> {
    const slot = await this.recurringRepo.findOne({
      where: { id, doctorId },
    });
    if (!slot) {
      throw new NotFoundException(
        `Recurring availability slot with ID ${id} not found`,
      );
    }
    return slot;
  }

  private validateTimeRange(startTime: string, endTime: string): void {
    if (toMinutes(startTime) >= toMinutes(endTime)) {
      throw new BadRequestException(
        `endTime (${endTime}) must be after startTime (${startTime})`,
      );
    }
  }

  private validateDateNotPast(date: string): void {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const inputDate = new Date(date + 'T00:00:00');
    if (inputDate < today) {
      throw new BadRequestException(
        `date (${date}) cannot be in the past`,
      );
    }
  }

  private checkRecurringOverlap(
    existingSlots: RecurringAvailability[],
    startTime: string,
    endTime: string,
  ): void {
    for (const slot of existingSlots) {
      if (timesOverlap(startTime, endTime, slot.startTime, slot.endTime)) {
        throw new ConflictException(
          `Time slot ${startTime}–${endTime} overlaps with existing slot ${slot.startTime}–${slot.endTime}`,
        );
      }
    }
  }

  private checkCustomOverlap(
    existingSlots: CustomAvailability[],
    startTime: string,
    endTime: string,
  ): void {
    for (const slot of existingSlots) {
      if (timesOverlap(startTime, endTime, slot.startTime, slot.endTime)) {
        throw new ConflictException(
          `Time slot ${startTime}–${endTime} overlaps with existing slot ${slot.startTime}–${slot.endTime}`,
        );
      }
    }
  }
}
