import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService) {
    super({
      // Extract JWT from either Authorization header or 'token' cookie
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        (request: any) => {
          return request?.cookies?.token ?? null;
        },
      ]),
      ignoreExpiration: false,
      // Non-null assertion: JWT_SECRET is always defined in .env
      secretOrKey: configService.get<string>('JWT_SECRET') as string,
    });
  }

  async validate(payload: { sub: string; email: string; role: string }) {
    // This return value is attached to req.user
    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
    };
  }
}
