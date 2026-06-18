import {
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
}

export class UpdateDoctorProfileDto extends PartialType(CreateDoctorProfileDto) {}


