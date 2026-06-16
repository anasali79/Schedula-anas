import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Doctor } from './doctor.entity';
import { SchedulingType } from '../../common/enums/scheduling-type.enum';

@Entity('custom_availabilities')
export class CustomAvailability {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  doctorId: string;

  @ManyToOne(() => Doctor, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'doctorId' })
  doctor: Doctor;

  // Format: "YYYY-MM-DD" e.g. "2026-06-15"
  @Column({ type: 'date' })
  date: string;

  // Format: "HH:MM" in 24-hour time
  @Column({ type: 'varchar', length: 5 })
  startTime: string;

  @Column({ type: 'varchar', length: 5 })
  endTime: string;

  // Slot duration in minutes (e.g. 10, 15, 30) — used for STREAM scheduling
  @Column({ type: 'int', default: 15 })
  slotDuration: number;

  // Scheduling type: STREAM (exact time slots) or WAVE (token-based window)
  @Column({ type: 'varchar', length: 10, default: SchedulingType.STREAM })
  schedulingType: SchedulingType;

  // Buffer time in minutes between slots — used for STREAM scheduling (optional)
  @Column({ type: 'int', default: 0 })
  bufferTime: number;

  // Maximum number of patients per wave — used for WAVE scheduling
  @Column({ type: 'int', default: 0 })
  maxPatients: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
