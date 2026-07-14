import { IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';

const DATE_REGEX = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

export class CreateLeaveDto {
  @IsString()
  @IsNotEmpty({ message: 'date is required' })
  @Matches(DATE_REGEX, {
    message: 'date must be in YYYY-MM-DD format, e.g. "2026-06-15"',
  })
  date: string;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class UpdateLeaveDto extends PartialType(CreateLeaveDto) {}
