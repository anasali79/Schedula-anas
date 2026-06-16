import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
} from 'class-validator';

export class BookAppointmentDto {
  @IsNotEmpty({ message: 'doctorId is required' })
  @IsUUID('4', { message: 'doctorId must be a valid UUID' })
  doctorId: string;

  @IsNotEmpty({ message: 'date is required' })
  @IsString()
  @Matches(/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/, {
    message: 'date must be in YYYY-MM-DD format, e.g. "2026-06-20"',
  })
  date: string;

  @IsNotEmpty({ message: 'startTime is required' })
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'startTime must be in HH:MM format (24-hour), e.g. "10:00"',
  })
  startTime: string;

  @IsNotEmpty({ message: 'endTime is required' })
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'endTime must be in HH:MM format (24-hour), e.g. "10:15"',
  })
  endTime: string;
}
