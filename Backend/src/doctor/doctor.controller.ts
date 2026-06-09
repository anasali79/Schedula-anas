import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
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

@Controller('doctor')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.DOCTOR)
export class DoctorController {
  constructor(private readonly doctorService: DoctorService) {}

  @Post('profile')
  createProfile(
    @CurrentUser() user: { id: string },
    @Body() dto: CreateDoctorProfileDto,
  ) {
    return this.doctorService.createProfile(user.id, dto);
  }

  @Get('profile')
  getProfile(@CurrentUser() user: { id: string }) {
    return this.doctorService.getProfile(user.id);
  }

  @Patch('profile')
  updateProfile(
    @CurrentUser() user: { id: string },
    @Body() dto: UpdateDoctorProfileDto,
  ) {
    return this.doctorService.updateProfile(user.id, dto);
  }

  @Get('dashboard')
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
}
