import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from 'class-validator';

export class CreatePatientProfileDto {
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @IsInt()
  @Min(1)
  @Max(150)
  age: number;

  @IsString()
  @IsIn(['MALE', 'FEMALE', 'OTHER'])
  gender: string;

  @IsString()
  @MinLength(10)
  phone: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  basicHealthInfo?: string;
}

export class UpdatePatientProfileDto {
  @IsString()
  @IsOptional()
  @IsNotEmpty()
  fullName?: string;

  @IsInt()
  @IsOptional()
  @Min(1)
  @Max(150)
  age?: number;

  @IsString()
  @IsOptional()
  @IsIn(['MALE', 'FEMALE', 'OTHER'])
  gender?: string;

  @IsString()
  @IsOptional()
  @MinLength(10)
  phone?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  basicHealthInfo?: string;
}
