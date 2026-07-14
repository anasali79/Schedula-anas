import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  IsInt,
  Min,
  Max,
  IsArray,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
  Validate,
  registerDecorator,
  ValidationOptions,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';
import { DayOfWeek } from '../entities/recurring-availability.entity';
import { SchedulingType } from '../../common/enums/scheduling-type.enum';
import { PartialType } from '@nestjs/mapped-types';

// ─── SlotStatus ───
export enum SlotStatus {
  AVAILABLE = 'available',
  BOOKED = 'booked',
  CANCEL_AND_AVAILABLE = 'cancel and available for booking',
}

// ─── Shared Regex ─────────────────────────────────────────────────────────────
const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;
const DATE_REGEX = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;


/**
 * Validates that endTime is after startTime
 */
@ValidatorConstraint({ name: 'isEndAfterStart', async: false })
export class IsEndAfterStartConstraint implements ValidatorConstraintInterface {
  validate(_: string, args: ValidationArguments): boolean {
    const obj = args.object as any;
    if (!obj.startTime || !obj.endTime) return true;
    return obj.endTime > obj.startTime;
  }
  defaultMessage(): string {
    return 'endTime must be after startTime';
  }
}

/**
 * Validates that either dayOfWeek or daysOfWeek is provided, but not both
 */
@ValidatorConstraint({ name: 'dayOfWeekXOR', async: false })
export class DayOfWeekXORConstraint implements ValidatorConstraintInterface {
  validate(_: any, args: ValidationArguments): boolean {
    const obj = args.object as CreateRecurringAvailabilityDto;
    const hasSingle = !!obj.dayOfWeek;
    const hasMultiple = Array.isArray(obj.daysOfWeek) && obj.daysOfWeek.length > 0;
    return hasSingle !== hasMultiple;
  }
  defaultMessage(): string {
    return 'Provide either dayOfWeek or daysOfWeek — not both, not neither';
  }
}
function BothOrNeitherTime(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'bothOrNeitherTime',
      target: (object as any).constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(_: any, args: ValidationArguments): boolean {
          const obj = args.object as any;
          const hasStart = !!obj.startTime;
          const hasEnd = !!obj.endTime;
          return hasStart === hasEnd;
        },
        defaultMessage(): string {
          return 'Both startTime and endTime must be provided together, or both must be omitted';
        },
      },
    });
  };
}

// ─── Recurring Availability DTOs ──────────────────────────────────────────────

export class CreateRecurringAvailabilityDto {
  @IsOptional()
  @IsEnum(DayOfWeek, {
    message: `dayOfWeek must be one of: ${Object.values(DayOfWeek).join(', ')}`,
  })
  @Validate(DayOfWeekXORConstraint)
  dayOfWeek?: DayOfWeek;

  @IsOptional()
  @IsArray({ message: 'daysOfWeek must be an array' })
  @IsEnum(DayOfWeek, {
    each: true,
    message: `each element in daysOfWeek must be one of: ${Object.values(DayOfWeek).join(', ')}`,
  })
  daysOfWeek?: DayOfWeek[];

  @IsString()
  @IsNotEmpty({ message: 'startTime is required' })
  @Matches(TIME_REGEX, {
    message: 'startTime must be in HH:MM format (24-hour), e.g. "09:00"',
  })
  startTime: string;

  @IsString()
  @IsNotEmpty({ message: 'endTime is required' })
  @Matches(TIME_REGEX, {
    message: 'endTime must be in HH:MM format (24-hour), e.g. "17:00"',
  })
  @Validate(IsEndAfterStartConstraint)
  endTime: string;
  @IsOptional()
  @IsEnum(SchedulingType, {
    message: `schedulingType must be one of: ${Object.values(SchedulingType).join(', ')}`,
  })
  schedulingType?: SchedulingType;

  // ─── STREAM fields ───
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'slotDuration must be an integer' })
  @Min(1, { message: 'slotDuration must be at least 1 minute' })
  slotDuration?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'bufferTime must be an integer' })
  @Min(0, { message: 'bufferTime cannot be negative' })
  bufferTime?: number;

  // ─── WAVE fields ───
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'maxPatients must be an integer' })
  @Min(1, { message: 'maxPatients must be at least 1' })
  maxPatients?: number;

  @IsOptional()
  @IsBoolean()
  allowFutureBooking?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0, { message: 'maxFutureBookingDays cannot be negative' })
  maxFutureBookingDays?: number | null;
}

export class UpdateRecurringAvailabilityDto extends PartialType(CreateRecurringAvailabilityDto) { }

// ─── Custom Availability DTOs ─────────────────────────────────────────────────

export class CreateCustomAvailabilityDto {
  @IsString()
  @IsNotEmpty({ message: 'date is required' })
  @Matches(DATE_REGEX, {
    message: 'date must be in YYYY-MM-DD format, e.g. "2026-06-15"',
  })
  date: string;

  @IsString()
  @IsNotEmpty({ message: 'startTime is required' })
  @Matches(TIME_REGEX, {
    message: 'startTime must be in HH:MM format (24-hour), e.g. "14:00"',
  })
  startTime: string;

  @IsString()
  @IsNotEmpty({ message: 'endTime is required' })
  @Matches(TIME_REGEX, {
    message: 'endTime must be in HH:MM format (24-hour), e.g. "15:00"',
  })
  @Validate(IsEndAfterStartConstraint)
  endTime: string;

  @IsOptional()
  @IsEnum(SchedulingType, {
    message: `schedulingType must be one of: ${Object.values(SchedulingType).join(', ')}`,
  })
  schedulingType?: SchedulingType;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'slotDuration must be an integer' })
  @Min(1, { message: 'slotDuration must be at least 1 minute' })
  slotDuration?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'bufferTime must be an integer' })
  @Min(0, { message: 'bufferTime cannot be negative' })
  bufferTime?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'maxPatients must be an integer' })
  @Min(1, { message: 'maxPatients must be at least 1' })
  maxPatients?: number;

  @IsOptional()
  @IsBoolean()
  allowFutureBooking?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0, { message: 'maxFutureBookingDays cannot be negative' })
  maxFutureBookingDays?: number | null;
}

// ─── Query / Utility DTOs ─────────────────────────────────────────────────────

export class GetAvailabilityByDateDto {
  @IsString()
  @IsNotEmpty({ message: 'date is required' })
  @Matches(DATE_REGEX, {
    message: 'date must be in YYYY-MM-DD format, e.g. "2026-06-15"',
  })
  date: string;
}

export class CancelOccurrenceDto {
  @IsString()
  @IsNotEmpty({ message: 'date is required' })
  @Matches(DATE_REGEX, {
    message: 'date must be in YYYY-MM-DD format, e.g. "2026-06-15"',
  })
  date: string;

  @IsString()
  @IsNotEmpty({ message: 'startTime is required' })
  @Matches(TIME_REGEX, {
    message: 'startTime must be in HH:MM format (24-hour), e.g. "09:00"',
  })
  startTime: string;

  @IsString()
  @IsNotEmpty({ message: 'endTime is required' })
  @Matches(TIME_REGEX, {
    message: 'endTime must be in HH:MM format (24-hour), e.g. "12:00"',
  })
  @Validate(IsEndAfterStartConstraint)
  endTime: string;
}

export class GetSlotsQueryDto {
  @IsString()
  @IsNotEmpty({ message: 'date is required' })
  @Matches(DATE_REGEX, {
    message: 'date must be in YYYY-MM-DD format, e.g. "2026-06-15"',
  })
  date: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'duration must be an integer' })
  @Min(1, { message: 'duration must be at least 1 minute' })
  duration?: number;
}

export class SetUnavailableDto {
  @IsString()
  @IsNotEmpty({ message: 'date is required' })
  @Matches(DATE_REGEX, {
    message: 'date must be in YYYY-MM-DD format, e.g. "2026-06-15"',
  })
  date: string;

  @IsOptional()
  @IsString()
  @Matches(TIME_REGEX, {
    message: 'startTime must be in HH:MM format (24-hour), e.g. "09:00"',
  })
  @BothOrNeitherTime()
  startTime?: string;

  @IsOptional()
  @IsString()
  @Matches(TIME_REGEX, {
    message: 'endTime must be in HH:MM format (24-hour), e.g. "12:00"',
  })
  @Validate(IsEndAfterStartConstraint)
  endTime?: string;
}

// ─── Next Available Appointment Query DTO ─────────────────────────────────────

export class NextAvailableQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'searchWindow must be an integer' })
  @Min(1, { message: 'searchWindow must be at least 1' })
  @Max(30, { message: 'searchWindow cannot exceed 30 working days' })
  searchWindow?: number;
}

// ─── Update Availability Config DTO ───────────────────────────────────────────

export class UpdateAvailabilityConfigDto {
  @IsOptional()
  @IsBoolean()
  allowFutureBooking?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0, { message: 'maxFutureBookingDays cannot be negative' })
  maxFutureBookingDays?: number | null;
}
