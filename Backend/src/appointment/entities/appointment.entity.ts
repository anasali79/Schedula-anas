import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Doctor } from '../../doctor/entities/doctor.entity';
import { Patient } from '../../patient/entities/patient.entity';
import { AppointmentStatus } from '../../common/enums/appointment-status.enum';

@Entity('appointments')
export class Appointment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  doctorId: string;

  @ManyToOne(() => Doctor, { onDelete: 'CASCADE', eager: true })
  @JoinColumn({ name: 'doctorId' })
  doctor: Doctor;

  @Column({ type: 'uuid' })
  patientId: string;

  @ManyToOne(() => Patient, { onDelete: 'CASCADE', eager: true })
  @JoinColumn({ name: 'patientId' })
  patient: Patient;

  @Column({ type: 'date' })
  date: string; // YYYY-MM-DD

  @Column({ type: 'varchar', length: 5 })
  startTime: string; // HH:MM

  @Column({ type: 'varchar', length: 5 })
  endTime: string; // HH:MM

  @Column({ type: 'varchar', default: AppointmentStatus.CONFIRMED })
  status: AppointmentStatus;

  @Column({ type: 'int', nullable: true, default: null })
  tokenNumber: number | null;

  @Column({ type: 'boolean', default: false })
  reminderSent: boolean;

  @Column({ type: 'timestamp', nullable: true, default: null })
  checkedInAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
