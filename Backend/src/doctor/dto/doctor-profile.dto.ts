import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

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

  @IsObject()
  consultationHours: Record<string, { start: string; end: string }[]>;

  @IsString()
  @IsOptional()
  profileDetails?: string;
}

export class UpdateDoctorProfileDto {
  @IsString()
  @IsOptional()
  @IsNotEmpty()
  fullName?: string;

  @IsString()
  @IsOptional()
  @IsNotEmpty()
  specialization?: string;

  @IsInt()
  @IsOptional()
  @Min(0)
  experience?: number;

  @IsString()
  @IsOptional()
  @IsNotEmpty()
  qualification?: string;

  @IsNumber()
  @IsOptional()
  @Min(0)
  consultationFee?: number;

  @IsObject()
  @IsOptional()
  consultationHours?: Record<string, { start: string; end: string }[]>;

  @IsString()
  @IsOptional()
  profileDetails?: string;
}
