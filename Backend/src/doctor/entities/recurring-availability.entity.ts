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

export enum DayOfWeek {
  MONDAY = 'MONDAY',
  TUESDAY = 'TUESDAY',
  WEDNESDAY = 'WEDNESDAY',
  THURSDAY = 'THURSDAY',
  FRIDAY = 'FRIDAY',
  SATURDAY = 'SATURDAY',
  SUNDAY = 'SUNDAY',
}

@Entity('recurring_availabilities')
export class RecurringAvailability {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  doctorId: string;

  @ManyToOne(() => Doctor, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'doctorId' })
  doctor: Doctor;

  @Column({
    type: 'enum',
    enum: DayOfWeek,
  })
  dayOfWeek: DayOfWeek;

  // Format: "HH:MM" in 24-hour time e.g. "10:00", "13:30"
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
