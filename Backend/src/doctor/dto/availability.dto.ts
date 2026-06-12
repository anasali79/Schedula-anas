import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';
import { DayOfWeek } from '../entities/recurring-availability.entity';

const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;
const DATE_REGEX = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

// ─── Recurring Availability DTOs ──────────────────────────────────────────────

export class CreateRecurringAvailabilityDto {
  @IsEnum(DayOfWeek, {
    message: `dayOfWeek must be one of: ${Object.values(DayOfWeek).join(', ')}`,
  })
  dayOfWeek: DayOfWeek;

  @IsString()
  @IsNotEmpty()
  @Matches(TIME_REGEX, {
    message: 'startTime must be in HH:MM format (24-hour), e.g. "09:00"',
  })
  startTime: string;

  @IsString()
  @IsNotEmpty()
  @Matches(TIME_REGEX, {
    message: 'endTime must be in HH:MM format (24-hour), e.g. "17:00"',
  })
  endTime: string;
}

export class UpdateRecurringAvailabilityDto {
  @IsOptional()
  @IsEnum(DayOfWeek, {
    message: `dayOfWeek must be one of: ${Object.values(DayOfWeek).join(', ')}`,
  })
  dayOfWeek?: DayOfWeek;

  @IsOptional()
  @IsString()
  @Matches(TIME_REGEX, {
    message: 'startTime must be in HH:MM format (24-hour), e.g. "09:00"',
  })
  startTime?: string;

  @IsOptional()
  @IsString()
  @Matches(TIME_REGEX, {
    message: 'endTime must be in HH:MM format (24-hour), e.g. "17:00"',
  })
  endTime?: string;
}

// ─── Custom Availability DTOs ─────────────────────────────────────────────────

export class CreateCustomAvailabilityDto {
  @IsString()
  @IsNotEmpty()
  @Matches(DATE_REGEX, {
    message: 'date must be in YYYY-MM-DD format, e.g. "2026-06-15"',
  })
  date: string;

  @IsString()
  @IsNotEmpty()
  @Matches(TIME_REGEX, {
    message: 'startTime must be in HH:MM format (24-hour), e.g. "14:00"',
  })
  startTime: string;

  @IsString()
  @IsNotEmpty()
  @Matches(TIME_REGEX, {
    message: 'endTime must be in HH:MM format (24-hour), e.g. "15:00"',
  })
  endTime: string;
}

export class GetAvailabilityByDateDto {
  @IsString()
  @IsNotEmpty()
  @Matches(DATE_REGEX, {
    message: 'date must be in YYYY-MM-DD format, e.g. "2026-06-15"',
  })
  date: string;
}

export class CancelOccurrenceDto {
  @IsString()
  @IsNotEmpty()
  @Matches(DATE_REGEX, {
    message: 'date must be in YYYY-MM-DD format, e.g. "2026-06-15"',
  })
  date: string;

  @IsString()
  @IsNotEmpty()
  @Matches(TIME_REGEX, {
    message: 'startTime must be in HH:MM format (24-hour), e.g. "09:00"',
  })
  startTime: string;

  @IsString()
  @IsNotEmpty()
  @Matches(TIME_REGEX, {
    message: 'endTime must be in HH:MM format (24-hour), e.g. "12:00"',
  })
  endTime: string;
}
