import { NestFactory } from '@nestjs/core';
import { RequestMethod, ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import cookieParser from 'cookie-parser';
import { GlobalExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api', {
    exclude: [{ path: '/', method: RequestMethod.GET }],
  });

  app.use(cookieParser());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Global exception filter — consistent JSON error responses, no server crashes
  app.useGlobalFilters(new GlobalExceptionFilter());

  const allowedOrigins = (
    process.env.CLIENT_URL || 'http://localhost:5173,https://schedula-anas.vercel.app'
  ).split(',').map(o => o.trim());

  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, Postman)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`CORS: Origin ${origin} not allowed`), false);
    },
    credentials: true,
  });

  const port = process.env.PORT ?? 3000;
  await app.listen(port, '0.0.0.0');
  console.log(`Schedula Backend running on port ${port}`);
  console.log(`API base URL: /api`);
  console.log(
    `Auth routes:        /api/auth/signup  |  /api/auth/login  |  /api/auth/logout`,
  );
  console.log(
    `Doctor routes:      /api/doctor  |  /api/doctor/:id  |  /api/doctor/profile`,
  );
  console.log(`Patient routes:     /api/patient/profile`);
}
bootstrap();
