import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Role } from '../../common/enums/role.enum';

export class SignupDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100, { message: 'name must be at most 100 characters' })
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsEnum(Role, { message: 'role must be DOCTOR or PATIENT' })
  role: Role;
}
