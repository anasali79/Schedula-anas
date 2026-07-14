import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Appointment } from '../../appointment/entities/appointment.entity';
import { Patient } from '../../patient/entities/patient.entity';
import { CheckInRequestStatus } from '../enums/check-in-request-status.enum';

@Entity('check_in_requests')
export class CheckInRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  appointmentId: string;

  @ManyToOne(() => Appointment, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'appointmentId' })
  appointment: Appointment;

  @Column({ type: 'uuid' })
  patientId: string;

  @ManyToOne(() => Patient, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'patientId' })
  patient: Patient;

  @Column({ type: 'varchar', default: CheckInRequestStatus.PENDING })
  status: CheckInRequestStatus;

  @Column({ type: 'timestamp' })
  expiresAt: Date;

  @Column({ type: 'timestamp', nullable: true, default: null })
  respondedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
