import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
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
import { AvailabilityService } from './availability.service';
import {
  CreateRecurringAvailabilityDto,
  UpdateRecurringAvailabilityDto,
  CreateCustomAvailabilityDto,
  CancelOccurrenceDto,
  SetUnavailableDto,
} from './dto/availability.dto';

@Controller('doctor/availability')
export class AvailabilityController {
  constructor(private readonly availabilityService: AvailabilityService) {}

  // ─── Recurring Availability ──────────────────────────────────────────────────

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.DOCTOR)
  async createRecurring(
    @CurrentUser() user: { id: string },
    @Body() dto: CreateRecurringAvailabilityDto,
  ) {
    const slot = await this.availabilityService.createRecurring(user.id, dto);
    return {
      message: 'Recurring availability slot created successfully',
      data: slot,
    };
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.DOCTOR)
  async getDetailedAvailability(@CurrentUser() user: { id: string }) {
    const details = await this.availabilityService.getDetailedAvailability(
      user.id,
    );
    return {
      message: 'Detailed availability dashboard retrieved successfully',
      data: details,
    };
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.DOCTOR)
  async updateRecurring(
    @CurrentUser() user: { id: string },
    @Param(
      'id',
      new ParseUUIDPipe({
        version: '4',
        exceptionFactory: () =>
          new BadRequestException(
            'Invalid slot ID format. Expected a valid UUID.',
          ),
      }),
    )
    id: string,
    @Body() dto: UpdateRecurringAvailabilityDto,
  ) {
    const slot = await this.availabilityService.updateRecurring(
      user.id,
      id,
      dto,
    );
    return {
      message: 'Recurring availability slot updated successfully',
      data: slot,
    };
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.DOCTOR)
  @HttpCode(HttpStatus.OK)
  async deleteRecurring(
    @CurrentUser() user: { id: string },
    @Param(
      'id',
      new ParseUUIDPipe({
        version: '4',
        exceptionFactory: () =>
          new BadRequestException(
            'Invalid slot ID format. Expected a valid UUID.',
          ),
      }),
    )
    id: string,
  ) {
    await this.availabilityService.deleteRecurring(user.id, id);
    return { message: 'Recurring availability slot deleted successfully' };
  }

  // ─── Custom Availability (Override) ─────────────────────────────────────────

  @Post('override')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.DOCTOR)
  async createCustomOverride(
    @CurrentUser() user: { id: string },
    @Body() dto: CreateCustomAvailabilityDto,
  ) {
    const slot = await this.availabilityService.createCustomOverride(
      user.id,
      dto,
    );
    return {
      message: 'Custom availability override created successfully',
      data: slot,
    };
  }

  @Post('cancel')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.DOCTOR)
  @HttpCode(HttpStatus.OK)
  async cancelOccurrence(
    @CurrentUser() user: { id: string },
    @Body() dto: CancelOccurrenceDto,
  ) {
    await this.availabilityService.cancelOccurrence(
      user.id,
      dto.date,
      dto.startTime,
      dto.endTime,
    );
    return {
      message: `Slot ${dto.startTime}-${dto.endTime} on ${dto.date} has been cancelled successfully`,
    };
  }

  @Post('unavailable')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.DOCTOR)
  @HttpCode(HttpStatus.OK)
  async setUnavailable(
    @CurrentUser() user: { id: string },
    @Body() dto: SetUnavailableDto,
  ) {
    const rescheduled = await this.availabilityService.setUnavailable(
      user.id,
      dto.date,
      dto.startTime,
      dto.endTime,
    );
    return {
      message: dto.startTime && dto.endTime
        ? `Slot ${dto.startTime}-${dto.endTime} on ${dto.date} is now marked as unavailable. Affected appointments have been rescheduled.`
        : `Doctor is now marked as unavailable for the entire day of ${dto.date}. Affected appointments have been rescheduled.`,
      rescheduledAppointments: rescheduled,
    };
  }

  // Public route — patients/anyone can check a doctor's availability for a date
  @Get(':doctorId/:date')
  async getAvailabilityByDate(
    @Param(
      'doctorId',
      new ParseUUIDPipe({
        version: '4',
        exceptionFactory: () =>
          new BadRequestException(
            'Invalid doctor ID format. Expected a valid UUID.',
          ),
      }),
    )
    doctorId: string,
    @Param('date') date: string,
  ) {
    const result = await this.availabilityService.getAvailabilityByDate(
      doctorId,
      date,
    );
    return {
      message:
        result.slots.length === 0
          ? `Doctor is not available on ${date}`
          : `Availability for ${date} retrieved successfully`,
      data: result,
    };
  }
}
