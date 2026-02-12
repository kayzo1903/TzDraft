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

  // Enable CORS
  app.enableCors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    credentials: true,
  });

  const configService = app.get(ConfigService);
  const port = configService.get('PORT') || 3002;

  // Explicitly bind to all interfaces (required by some PaaS port scanners).
  await app.listen(port, '0.0.0.0');
  console.log(`TzDraft server listening on port ${port}`);
}
bootstrap();
