import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  getRoot() {
    return {
      message: 'Schedula Backend API is running',
      status: 'ok',
      apiBase: '/api',
      routes: {
        auth: '/api/auth/signup | /api/auth/login | /api/auth/logout',
        doctor: '/api/doctor | /api/doctor/:id | /api/doctor/profile',
        patient: '/api/patient/profile',
      },
    };
  }
}
