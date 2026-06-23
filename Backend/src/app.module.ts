import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { DoctorModule } from './doctor/doctor.module';
import { PatientModule } from './patient/patient.module';
import { AppointmentModule } from './appointment/appointment.module';
import { NotificationModule } from './notification/notification.module';
import { getDatabaseConfig } from './config/database.config';

@Module({
  controllers: [AppController],
  imports: [
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
  ],
})
export class AppModule {}
