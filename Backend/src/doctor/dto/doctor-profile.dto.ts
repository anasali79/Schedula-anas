import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

import { PartialType } from '@nestjs/mapped-types';

export class CreateDoctorProfileDto {
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @IsString()
  @IsNotEmpty()
  specialization: string;

  @IsInt()
  @Min(0)
  experience: number;

  @IsString()
  @IsNotEmpty()
  qualification: string;

  @IsNumber()
  @Min(0)
  consultationFee: number;


  @IsString()
  @IsOptional()
  profileDetails?: string;

  @IsBoolean()
  @IsOptional()
  allowFutureBooking?: boolean;

  @IsInt()
  @Min(0, { message: 'maxFutureBookingDays cannot be negative' })
  @IsOptional()
  maxFutureBookingDays?: number | null;
}

export class UpdateDoctorProfileDto extends PartialType(CreateDoctorProfileDto) {}


