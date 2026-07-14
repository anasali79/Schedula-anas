import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '../common/enums/role.enum';
import { AppointmentService } from './appointment.service';
import { BookAppointmentDto } from './dto/book-appointment.dto';
import { RescheduleAppointmentDto } from './dto/reschedule-appointment.dto';
import { ReminderService } from '../reminder/reminder.service';

@Controller()
export class AppointmentController {
  constructor(
    private readonly appointmentService: AppointmentService,
    private readonly reminderService: ReminderService,
  ) { }

  // ─── 1. Book Appointment (Patient only) ───────────────────────────────────────
  // POST /api/appointment
  @Post('appointment')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PATIENT)
  bookAppointment(
    @CurrentUser() user: { id: string },
    @Body() dto: BookAppointmentDto,
  ) {
    return this.appointmentService.bookAppointment(user.id, dto);
  }

  // ─── 2. Patient Appointment View ──────────────────────────────────────────────
  // GET /api/appointment/my
  @Get('appointment/my')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PATIENT)
  getMyAppointments(@CurrentUser() user: { id: string }) {
    return this.appointmentService.getPatientAppointments(user.id);
  }

  // ─── 3. Cancel Appointment (Patient only) ─────────────────────────────────────
  // PATCH /api/appointment/:id/cancel
  @Patch('appointment/:id/cancel')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PATIENT)
  cancelAppointment(
    @CurrentUser() user: { id: string },
    @Param(
      'id',
      new ParseUUIDPipe({
        version: '4',
        exceptionFactory: () =>
          new BadRequestException('Invalid appointment ID format'),
      }),
    )
    id: string,
  ) {
    return this.appointmentService.cancelAppointment(user.id, id);
  }

  // ─── 4. Reschedule Appointment (Patient only) ─────────────────────────────────
  // PATCH /api/appointment/:id/reschedule
  @Patch('appointment/:id/reschedule')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.PATIENT)
  rescheduleAppointment(
    @CurrentUser() user: { id: string },
    @Param(
      'id',
      new ParseUUIDPipe({
        version: '4',
        exceptionFactory: () =>
          new BadRequestException('Invalid appointment ID format'),
      }),
    )
    id: string,
    @Body() dto: RescheduleAppointmentDto,
  ) {
    return this.appointmentService.rescheduleAppointment(user.id, id, dto);
  }

  // DEV ONLY — POST http://localhost:3000/api/appointment/test-reminders
  @Post('appointment/test-reminders')
  async triggerDailyReminders() {
    await this.reminderService.sendMorningReminders();
    await this.reminderService.sendEveningReminders();
    return {
      success: true,
      message: 'Reminder triggered successfully',
    };
  }
}
