import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AppointmentGateway } from './appointment.gateway';

/**
 * SocketsModule
 *
 * @Global() — registered once in AppModule; AppointmentGateway is available
 * for injection in ANY module without re-importing this module.
 *
 * This module is self-contained:
 *  - owns AppointmentGateway
 *  - registers its own JwtModule (async, reads JWT_SECRET from .env)
 *  - exports AppointmentGateway so services can inject it
 */
@Global()
@Module({
  imports: [
    // Gateway needs JwtService to verify the cookie token on connection
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET')!,
      }),
    }),
  ],
  providers: [AppointmentGateway],
  exports: [AppointmentGateway],
})
export class SocketsModule {}
