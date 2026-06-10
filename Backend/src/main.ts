import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');

  app.use(cookieParser());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );


  app.enableCors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173',
    credentials: true,
  });

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`Schedula Backend running at: http://localhost:${port}/api`);
  console.log(`Auth routes:    /api/auth/signup  |  /api/auth/login  |  /api/auth/logout`);
  console.log(`Doctor routes:  /api/doctor  |  /api/doctor/:id  |  /api/doctor/profile`);
  console.log(`Patient routes: /api/patient/profile`);
}
bootstrap();
