import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '../common/enums/role.enum';

@Controller('doctor')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.DOCTOR)
export class DoctorController {
  // GET /doctor/profile — only accessible by DOCTOR role
  @Get('profile')
  getProfile(@CurrentUser() user: any) {
    return {
      message: 'Welcome, Doctor! This is your profile.',
      user,
    };
  }

  // GET /doctor/dashboard — only accessible by DOCTOR role
  @Get('dashboard')
  getDashboard(@CurrentUser() user: any) {
    return {
      message: 'Doctor dashboard',
      data: {
        doctorId: user._id,
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
