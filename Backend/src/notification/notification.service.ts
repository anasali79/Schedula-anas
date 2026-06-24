import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Notification } from './entities/notification.entity';
import { Patient } from '../patient/entities/patient.entity';
import { NotificationType } from './enums/notification-type.enum';

// Fix: readable date format helper
function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Kolkata',
  }).format(new Date(date));
}

// Fix: transform notification to include formatted date
function formatNotification(notification: Notification) {
  return {
    ...notification,
    createdAt: formatDate(notification.createdAt),
  };
}

@Injectable()
export class NotificationService {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepo: Repository<Notification>,

    @InjectRepository(Patient)
    private readonly patientRepo: Repository<Patient>,
  ) { }

  /**
   * Helper method to get patient by userId
   */
  private async getPatientByUserId(userId: string): Promise<Patient> {
    const patient = await this.patientRepo.findOne({
      where: { userId },
    });

    if (!patient) {
      throw new NotFoundException(
        'Patient profile not found. Please create your profile first.',
      );
    }

    return patient;
  }

  /**
   * Internal helper to create notification
   * @param patientId - must be a valid existing patient ID
   */
  async createNotification(
    patientId: string, title: string, message: string, type: NotificationType, note: string | null,
  ): Promise<Notification> {
    // Note: patientId is always validated by the caller (AppointmentService)
    // before this method is invoked — no redundant DB lookup needed here.
    const notification = this.notificationRepo.create({
      patientId,
      title,
      message,
      type,
      note,
      isRead: false,
    });

    return await this.notificationRepo.save(notification);
  }

  /**
   * Get all notifications for logged-in patient (with pagination)
   * Fix: meta aur success field add kiya, date format readable
   */
  async getNotifications(
    userId: string,
    page: number = 1,
    limit: number = 20,
  ) {
    const patient = await this.getPatientByUserId(userId);

    const skip = (page - 1) * limit;

    const [notifications, total] = await this.notificationRepo.findAndCount({
      where: { patientId: patient.id },
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    return {
      success: true,
      message:
        notifications.length > 0
          ? 'Notifications retrieved successfully'
          : 'No notifications found',
      data: notifications.map(formatNotification),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Mark a single notification as read
   * Fix: already-read notifications handled gracefully
   */
  async markAsRead(userId: string, notificationId: string) {
    const patient = await this.getPatientByUserId(userId);

    const notification = await this.notificationRepo.findOne({
      where: {
        id: notificationId,
        patientId: patient.id,
      },
    });

    if (!notification) {
      throw new NotFoundException(
        `Notification with ID ${notificationId} not found`,
      );
    }

    if (notification.isRead) {
      throw new BadRequestException('Notification is already marked as read');
    }

    notification.isRead = true;
    const updatedNotification = await this.notificationRepo.save(notification);

    return {
      success: true,
      message: 'Notification marked as read successfully',
      data: formatNotification(updatedNotification),
    };
  }

  /**
   * Mark all unread notifications as read
   */
  async markAllAsRead(userId: string) {
    const patient = await this.getPatientByUserId(userId);

    const result = await this.notificationRepo.update(
      { patientId: patient.id, isRead: false },
      { isRead: true },
    );

    return {
      success: true,
      message:
        (result.affected ?? 0) > 0
          ? 'All notifications marked as read successfully'
          : 'No unread notifications to mark as read',
      data: {
        updatedCount: result.affected ?? 0,
      },
    };
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(userId: string) {
    const patient = await this.getPatientByUserId(userId);

    const unreadCount = await this.notificationRepo.count({
      where: {
        patientId: patient.id,
        isRead: false,
      },
    });

    return {
      success: true,
      message: 'Unread notification count retrieved successfully',
      data: {
        unreadCount,
      },
    };
  }
}