import { Body, Controller, Get, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '../common/enums/role.enum';
import { PatientService } from './patient.service';
import {
  CreatePatientProfileDto,
  UpdatePatientProfileDto,
} from './dto/patient-profile.dto';
import { AppointmentService } from '../appointment/appointment.service';

@Controller('patient')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.PATIENT)
export class PatientController {
  constructor(
    private readonly patientService: PatientService,
    private readonly appointmentService: AppointmentService,
  ) {}

  @Post('profile')
  createProfile(
    @CurrentUser() user: { id: string },
    @Body() dto: CreatePatientProfileDto,
  ) {
    return this.patientService.createProfile(user.id, dto);
  }

  @Get('profile')
  getProfile(@CurrentUser() user: { id: string }) {
    return this.patientService.getProfile(user.id);
  }

  @Patch('profile')
  updateProfile(
    @CurrentUser() user: { id: string },
    @Body() dto: UpdatePatientProfileDto,
  ) {
    return this.patientService.updateProfile(user.id, dto);
  }

  @Get('dashboard')
  async getDashboard(
    @CurrentUser() user: { id: string; email: string; role: string },
  ) {
    const stats = await this.appointmentService.getPatientDashboardStats(user.id);
    return {
      message: 'Patient dashboard',
      data: {
        patientId: user.id,
        email: user.email,
        role: user.role,
        stats,
      },
    };
  }
}
