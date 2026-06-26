import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, EntityManager, In } from 'typeorm';
import { Appointment } from './entities/appointment.entity';
import { Doctor } from '../doctor/entities/doctor.entity';
import { AppointmentStatus } from '../common/enums/appointment-status.enum';
import { AppointmentGateway } from '../sockets/appointment.gateway';

@Injectable()
export class QueueService {
  private readonly logger = new Logger(QueueService.name);

  constructor(
    @InjectRepository(Appointment)
    private readonly appointmentRepo: Repository<Appointment>,
    @InjectRepository(Doctor)
    private readonly doctorRepo: Repository<Doctor>,
    private readonly appointmentGateway: AppointmentGateway,
  ) { }

  /**
   * Recalculates the queue position and waiting times for all active appointments
   * of a specific doctor on a specific date. Must be run within a transaction with
   * a pessimistic write lock to prevent race conditions.
   */
  async recalculateQueue(
    doctorId: string,
    date: string,
    manager: EntityManager,
  ): Promise<void> {
    this.logger.log(`Recalculating queue for doctor ${doctorId} on date ${date}`);
    const appointments = await manager
      .createQueryBuilder(Appointment, 'a')
      .where('a.doctorId = :doctorId', { doctorId })
      .andWhere('a.date = :date', { date })
      .andWhere('a.status IN (:...statuses)', {
        statuses: [
          AppointmentStatus.CONFIRMED,
          AppointmentStatus.CHECKED_IN,
          AppointmentStatus.IN_CONSULTATION,
        ],
      })
      .setLock('pessimistic_write')
      .getMany();

    // 2. Identify current serving appointment
    const currentServing = appointments.find(
      (app) => app.status === AppointmentStatus.IN_CONSULTATION,
    );

    // 3. Filter and sort the waiting queue (CHECKED_IN and CONFIRMED)
    const waitingQueue = appointments.filter(
      (app) =>
        app.status === AppointmentStatus.CHECKED_IN ||
        app.status === AppointmentStatus.CONFIRMED,
    );

    waitingQueue.sort((a, b) => {
      // Rule 1: CHECKED_IN first
      if (a.status === AppointmentStatus.CHECKED_IN && b.status === AppointmentStatus.CONFIRMED) {
        return -1;
      }
      if (a.status === AppointmentStatus.CONFIRMED && b.status === AppointmentStatus.CHECKED_IN) {
        return 1;
      }

      // Rule 2: Earlier check-in time first (if both are CHECKED_IN)
      if (a.status === AppointmentStatus.CHECKED_IN && b.status === AppointmentStatus.CHECKED_IN) {
        const timeA = a.checkedInAt ? new Date(a.checkedInAt).getTime() : 0;
        const timeB = b.checkedInAt ? new Date(b.checkedInAt).getTime() : 0;
        if (timeA !== timeB) {
          return timeA - timeB;
        }
      }

      // Rule 3: Token order (wave booking)
      if (a.tokenNumber !== null && b.tokenNumber !== null) {
        if (a.tokenNumber !== b.tokenNumber) {
          return a.tokenNumber - b.tokenNumber;
        }
      }

      // Rule 4: Slot time (slot booking fallback)
      if (a.startTime !== b.startTime) {
        return a.startTime.localeCompare(b.startTime);
      }

      return 0;
    });

    // 4. Update queue positions and estimated wait times
    const hasCurrentServing = !!currentServing;
    const avgConsultationTime = 15; // default 15 minutes

    // Update current serving if it exists
    if (currentServing) {
      currentServing.queuePosition = null;
      currentServing.estimatedWaitTime = 0;
      await manager.save(currentServing);
    }

    // Update waiting queue appointments
    for (let i = 0; i < waitingQueue.length; i++) {
      const app = waitingQueue[i];
      app.queuePosition = i + 1;

      // peopleAhead is the index in the waiting list plus 1 if there is a patient in consultation
      const peopleAhead = i + (hasCurrentServing ? 1 : 0);
      app.estimatedWaitTime = peopleAhead * avgConsultationTime;

      await manager.save(app);
    }

    // 5. Update doctor's current serving token
    const doctor = await manager.findOne(Doctor, { where: { id: doctorId } });
    if (doctor) {
      doctor.currentServingToken = currentServing?.tokenNumber ?? null;
      await manager.save(doctor);
    }
  }

  /**
   * Broadcasts real-time events to patients and doctors.
   * This should be called AFTER the transaction commits.
   */
  async broadcastQueueStatus(
    doctorId: string,
    date: string,
    manager: EntityManager,
  ): Promise<void> {
    // 1. Fetch the latest state of appointments for the doctor on this date
    const appointments = await manager.find(Appointment, {
      where: {
        doctorId,
        date,
        status: In([
          AppointmentStatus.CONFIRMED,
          AppointmentStatus.CHECKED_IN,
          AppointmentStatus.IN_CONSULTATION,
        ]),
      },
      relations: { patient: true },
    });

    const currentServing = appointments.find(
      (app) => app.status === AppointmentStatus.IN_CONSULTATION,
    );

    const waitingQueue = appointments
      .filter(
        (app) =>
          app.status === AppointmentStatus.CHECKED_IN ||
          app.status === AppointmentStatus.CONFIRMED,
      )
      .sort((a, b) => (a.queuePosition ?? 999) - (b.queuePosition ?? 999));

    // Next appointments (only waiting ones, maximum 5)
    const nextList = waitingQueue.slice(0, 5).map((app) => ({
      appointmentId: app.id,
      token: app.tokenNumber,
      startTime: app.startTime,
      patientName: app.patient?.fullName || 'Patient',
    }));

    // Checked-in count waiting (excluding in-consultation)
    const waitingCount = appointments.filter(
      (app) => app.status === AppointmentStatus.CHECKED_IN,
    ).length;

    // Emit queue.updated
    const queueUpdatedPayload = {
      doctorId,
      currentServing: currentServing
        ? {
          appointmentId: currentServing.id,
          token: currentServing.tokenNumber,
          startTime: currentServing.startTime,
          patientName: currentServing.patient?.fullName || 'Patient',
        }
        : null,
      next: nextList,
      waitingCount,
    };

    this.appointmentGateway.emitQueueUpdated(doctorId, queueUpdatedPayload);

    // Emit doctor.status.board
    const doctorStatusBoardPayload = {
      current: currentServing
        ? (currentServing.tokenNumber ? `Token ${currentServing.tokenNumber}` : currentServing.startTime)
        : 'None',
      next: waitingQueue[0]
        ? (waitingQueue[0].tokenNumber ? `Token ${waitingQueue[0].tokenNumber}` : waitingQueue[0].startTime)
        : 'None',
      status: currentServing ? 'IN_PROGRESS' : 'IDLE',
    };
    this.appointmentGateway.emitDoctorStatusBoard(doctorId, doctorStatusBoardPayload);

    // Emit patient-specific queue.position.updated
    for (let i = 0; i < waitingQueue.length; i++) {
      const app = waitingQueue[i];
      const peopleAhead = i + (currentServing ? 1 : 0);
      const estimatedWait = `${app.estimatedWaitTime ?? 0} min`;

      this.appointmentGateway.emitQueuePositionUpdated(app.patientId, {
        patientId: app.patientId,
        yourToken: app.tokenNumber,
        peopleAhead,
        estimatedWait,
      });
    }
  }
}
