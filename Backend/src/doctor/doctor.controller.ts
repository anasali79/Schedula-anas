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

@Controller('doctor')
export class DoctorController {
  constructor(private readonly doctorService: DoctorService) {}

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
  getDashboard(@CurrentUser() user: { id: string; email: string; role: string }) {
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
