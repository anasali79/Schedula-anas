import { Controller, Get, Patch, Param, Query, UseGuards, ParseUUIDPipe, BadRequestException } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '../common/enums/role.enum';
import { NotificationService } from './notification.service';

@Controller('notifications')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.PATIENT)
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) { }

  @Get('unread-count')
  getUnreadCount(@CurrentUser() user: { id: string }) {
    return this.notificationService.getUnreadCount(user.id);
  }

  @Patch('read-all')
  markAllAsRead(@CurrentUser() user: { id: string }) {
    return this.notificationService.markAllAsRead(user.id);
  }

  @Patch(':id/read')
  markAsRead(
    @CurrentUser() user: { id: string },
    @Param(
      'id',
      new ParseUUIDPipe({
        version: '4',
        exceptionFactory: () =>
          new BadRequestException('Invalid notification ID format'),
      }),
    )
    id: string,
  ) {
    return this.notificationService.markAsRead(user.id, id);
  }

  // Fix: Query params se page aur limit le rahe hain
  @Get()
  getNotifications(
    @CurrentUser() user: { id: string },
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
  ) {
    return this.notificationService.getNotifications(
      user.id,
      Math.max(1, parseInt(page) || 1),
      Math.min(100, parseInt(limit) || 20), // max 100 per page
    );
  }
}