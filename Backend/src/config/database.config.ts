import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';
import { Doctor } from '../doctor/entities/doctor.entity';
import { Patient } from '../patient/entities/patient.entity';
import { RecurringAvailability } from '../doctor/entities/recurring-availability.entity';
import { CustomAvailability } from '../doctor/entities/custom-availability.entity';
import { Appointment } from '../appointment/entities/appointment.entity';
import { Notification } from '../notification/entities/notification.entity';
import { DoctorLeave } from '../doctor/entities/leave.entity';
import { CheckInRequest } from '../check-in/entities/check-in-request.entity';

export function getDatabaseConfig(config: ConfigService): TypeOrmModuleOptions {
  const databaseUrl = config.get<string>('DATABASE_URL');
  const isProduction = config.get<string>('NODE_ENV') === 'production';

  const shared = {
    type: 'postgres' as const,
    entities: [
      User,
      Doctor,
      Patient,
      RecurringAvailability,
      CustomAvailability,
      Appointment,
      Notification,
      DoctorLeave,
      CheckInRequest,
    ],
    synchronize: false,
    migrations: [__dirname + '/../migrations/*.js'],
    migrationsRun: true,
    logging: false,
    ssl: isProduction ? { rejectUnauthorized: false } : false,
  };

  if (databaseUrl) {
    return {
      ...shared,
      url: databaseUrl,
    };
  }

  return {
    ...shared,
    host: config.get<string>('DB_HOST'),
    port: config.get<number>('DB_PORT'),
    username: config.get<string>('DB_USERNAME'),
    password: config.get<string>('DB_PASSWORD'),
    database: config.get<string>('DB_NAME'),
  };
}
