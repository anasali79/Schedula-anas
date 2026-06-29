import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { DoctorModule } from './doctor/doctor.module';
import { PatientModule } from './patient/patient.module';
import { AppointmentModule } from './appointment/appointment.module';
import { NotificationModule } from './notification/notification.module';
import { CheckInModule } from './check-in/check-in.module';
import { getDatabaseConfig } from './config/database.config';
import { SocketsModule } from './sockets/sockets.module';
import { ReminderModule } from './reminder/reminder.module';

@Module({
  controllers: [AppController],
  imports: [
    // Enable NestJS schedule functionality
    ScheduleModule.forRoot(),
    // Load .env globally
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    // Connect to PostgreSQL via TypeORM
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => getDatabaseConfig(config),
    }),
    AuthModule,
    UsersModule,
    DoctorModule,
    PatientModule,
    AppointmentModule,
    NotificationModule,
    CheckInModule,
    SocketsModule,
    ReminderModule,
  ],
})
export class AppModule {}
