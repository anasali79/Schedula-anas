import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '../common/enums/role.enum';

@Controller('patient')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.PATIENT)
export class PatientController {
  // GET /patient/profile — only accessible by PATIENT role
  @Get('profile')
  getProfile(@CurrentUser() user: any) {
    return {
      message: `Welcome, This is your profile.`,
      user,
    };
  }

  // GET /patient/dashboard — only accessible by PATIENT role
  @Get('dashboard')
  getDashboard(@CurrentUser() user: any) {
    return {
      message: `Welcome, This is your dashboard.`,
      data: {
        patientId: user._id,
        email: user.email,
        role: user.role,
        stats: {
          upcomingAppointments: 0,
          pastAppointments: 0,
          prescriptions: 0,
        },
      },
    };
  }
}
