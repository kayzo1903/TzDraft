import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const configService = app.get(ConfigService);

  // Enable CORS
  const corsOriginsRaw =
    configService.get<string>('CORS_ORIGINS') ||
    configService.get<string>('CORS_ORIGIN') ||
    'http://localhost:3000';

  const allowedOrigins = corsOriginsRaw
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.enableCors({
    origin: (origin, callback) => {
      // Non-browser requests (curl, health checks) may not send Origin.
      if (!origin) return callback(null, true);

      // Allow all (use with care). With credentials=true, browsers will reflect the request origin.
      if (allowedOrigins.includes('*')) return callback(null, true);

      if (allowedOrigins.includes(origin)) return callback(null, true);

      return callback(new Error(`CORS origin not allowed: ${origin}`), false);
    },
    credentials: true,
  });

  const port = configService.get('PORT') || 3002;

  // Explicitly bind to all interfaces (required by some PaaS port scanners).
  await app.listen(port, '0.0.0.0');
  console.log(`TzDraft server listening on port ${port}`);
}
bootstrap();
