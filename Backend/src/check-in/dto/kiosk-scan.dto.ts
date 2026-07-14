import { IsNotEmpty, IsUUID } from 'class-validator';

export class KioskScanDto {
  @IsNotEmpty()
  @IsUUID('4', { message: 'appointmentId must be a valid UUID' })
  appointmentId: string;
}
