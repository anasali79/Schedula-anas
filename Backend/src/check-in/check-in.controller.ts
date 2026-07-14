import {
  BadRequestException,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '../common/enums/role.enum';
import { CheckInService } from './check-in.service';

@Controller('appointments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class CheckInController {
  constructor(private readonly checkInService: CheckInService) {}

  // ─── Pending check-in requests (patient must approve QR kiosk scan) ───────────
  @Get('check-in-requests/pending')
  @Roles(Role.PATIENT)
  getPendingCheckInRequests(@CurrentUser() user: { id: string }) {
    return this.checkInService.getPendingCheckInRequests(user.id);
  }

  @Post('check-in-requests/:requestId/approve')
  @Roles(Role.PATIENT)
  approveCheckInRequest(
    @CurrentUser() user: { id: string },
    @Param(
      'requestId',
      new ParseUUIDPipe({
        version: '4',
        exceptionFactory: () =>
          new BadRequestException('Invalid check-in request ID format'),
      }),
    )
    requestId: string,
  ) {
    return this.checkInService.approveCheckInRequest(user.id, requestId);
  }

  @Post('check-in-requests/:requestId/reject')
  @Roles(Role.PATIENT)
  rejectCheckInRequest(
    @CurrentUser() user: { id: string },
    @Param(
      'requestId',
      new ParseUUIDPipe({
        version: '4',
        exceptionFactory: () =>
          new BadRequestException('Invalid check-in request ID format'),
      }),
    )
    requestId: string,
  ) {
    return this.checkInService.rejectCheckInRequest(user.id, requestId);
  }

  // ─── 1. Patient direct Check-In (from own phone, logged in) ─────────────────
  // POST /api/appointments/:id/check-in
  @Post(':id/check-in')
  @Roles(Role.PATIENT)
  checkIn(
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
    return this.checkInService.checkIn(user.id, id);
  }

  // ─── 2. Doctor Manual Check-In ────────────────────────────────────────────────
  // POST /api/appointments/:id/manual-check-in
  @Post(':id/manual-check-in')
  @Roles(Role.DOCTOR)
  manualCheckIn(
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
    return this.checkInService.manualCheckIn(user.id, id);
  }

  // ─── 3. Doctor Start Consultation ─────────────────────────────────────────────
  // POST /api/appointments/:id/start-consultation
  @Post(':id/start-consultation')
  @Roles(Role.DOCTOR)
  startConsultation(
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
    return this.checkInService.startConsultation(user.id, id);
  }

  // ─── 4. Doctor Complete Appointment ───────────────────────────────────────────
  // POST /api/appointments/:id/complete
  @Post(':id/complete')
  @Roles(Role.DOCTOR)
  completeAppointment(
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
    return this.checkInService.completeAppointment(user.id, id);
  }

  // ─── 5. Doctor Mark No Show ───────────────────────────────────────────────────
  // POST /api/appointments/:id/no-show
  @Post(':id/no-show')
  @Roles(Role.DOCTOR)
  markNoShow(
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
    return this.checkInService.markNoShow(user.id, id);
  }
}
