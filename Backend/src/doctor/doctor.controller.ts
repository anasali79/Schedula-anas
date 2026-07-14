import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
  forwardRef,
  Inject,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '../common/enums/role.enum';
import { DoctorService } from './doctor.service';
import {
  CreateDoctorProfileDto,
  UpdateDoctorProfileDto,
} from './dto/doctor-profile.dto';
import { DoctorDiscoveryQueryDto } from './dto/doctor-discovery-query.dto';
import { AvailabilityService } from './availability.service';
import { GetSlotsQueryDto, NextAvailableQueryDto } from './dto/availability.dto';
import { AppointmentService } from '../appointment/appointment.service';

@Controller('doctor')
export class DoctorController {
  constructor(
    private readonly doctorService: DoctorService,
    private readonly availabilityService: AvailabilityService,
    @Inject(forwardRef(() => AppointmentService))
    private readonly appointmentService: AppointmentService,
  ) { }

  @Get()
  findAll(@Query() query: DoctorDiscoveryQueryDto) {
    return this.doctorService.findAll(query);
  }

  @Post('profile')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.DOCTOR)
  createProfile(
    @CurrentUser() user: { id: string },
    @Body() dto: CreateDoctorProfileDto,
  ) {
    return this.doctorService.createProfile(user.id, dto);
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.DOCTOR)
  getProfile(@CurrentUser() user: { id: string }) {
    return this.doctorService.getProfile(user.id);
  }

  @Patch('profile')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.DOCTOR)
  updateProfile(
    @CurrentUser() user: { id: string },
    @Body() dto: UpdateDoctorProfileDto,
  ) {
    return this.doctorService.updateProfile(user.id, dto);
  }

  @Get('dashboard')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.DOCTOR)
  getDashboard(
    @CurrentUser() user: { id: string; email: string; role: string },
  ) {
    return {
      message: 'Doctor dashboard',
      data: {
        doctorId: user.id,
        email: user.email,
        role: user.role,
        stats: {
          totalAppointments: 0,
          pendingAppointments: 0,
          completedAppointments: 0,
        },
      },
    };
  }

  @Get('appointments')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.DOCTOR)
  getDoctorAppointments(
    @CurrentUser() user: { id: string },
    @Query('date') date?: string,
  ) {
    return this.appointmentService.getDoctorAppointments(user.id, date);
  }

  @Patch('appointments/:id/cancel')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.DOCTOR)
  cancelAppointmentByDoctor(
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
    return this.appointmentService.cancelAppointmentByDoctor(user.id, id);
  }

  // ─── Next Available Appointment (Public) ────────────────────────────────────
  // GET /api/doctor/:doctorId/next-available?searchWindow=30
  @Get(':doctorId/next-available')
  async getNextAvailable(
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
    @Query() query: NextAvailableQueryDto,
  ) {
    const result =
      await this.availabilityService.getNextAvailableAppointment(
        doctorId,
        query.searchWindow,
      );
    return {
      message: result.message,
      data: result,
    };
  }

  @Get(':doctorId/slots')
  async getSlots(
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
    @Query() query: GetSlotsQueryDto,
  ) {
    const slots = await this.availabilityService.getAvailableSlots(
      doctorId,
      query.date,
      query.duration,
    );
    if ((slots as any).onLeave) {
      return {
        message: (slots as any).message || `Doctor is on leave on ${query.date}`,
        onLeave: true,
        data: [],
      };
    }
    return {
      message: 'Available slots retrieved successfully',
      data: slots,
    };
  }

  @Get(':id')
  findById(
    @Param(
      'id',
      new ParseUUIDPipe({
        version: '4',
        exceptionFactory: () =>
          new BadRequestException(
            'Invalid doctor ID format. Expected a valid UUID.',
          ),
      }),
    )
    id: string,
  ) {
    return this.doctorService.findById(id);
  }
}
