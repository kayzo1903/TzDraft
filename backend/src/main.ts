import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const isProd = process.env.NODE_ENV === 'production';

  const app = await NestFactory.create(AppModule, {
    logger: isProd ? false : undefined,
  });

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
    configService.get<string>('FRONTEND_URL') ||
    configService.get<string>('APP_URL') ||
    'http://localhost:3000';

  const allowedOrigins = corsOriginsRaw
    .split(/[,\n]/g)
    .map((origin) => origin.trim())
    .map((origin) => {
      if (
        origin.length >= 2 &&
        origin[0] === origin[origin.length - 1] &&
        (origin[0] === '"' || origin[0] === "'")
      ) {
        return origin.slice(1, -1).trim();
      }
      return origin;
    })
    .map((origin) => origin.replace(/\/$/, ''))
    .filter(Boolean);

  app.enableCors({
    origin: (origin, callback) => {
      // Non-browser requests (curl, health checks) may not send Origin.
      if (!origin) return callback(null, true);

      const normalizedOrigin = origin.replace(/\/$/, '');

      // Allow all (use with care). With credentials=true, browsers will reflect the request origin.
      if (allowedOrigins.includes('*')) return callback(null, true);

      if (allowedOrigins.includes(normalizedOrigin)) return callback(null, true);

      // Support wildcard subdomains like: https://*.tzdraft.co.tz
      for (const allowedOrigin of allowedOrigins) {
        if (!allowedOrigin.includes('*')) continue;

        try {
          const allowed = new URL(allowedOrigin.replace('*.', ''));
          const incoming = new URL(normalizedOrigin);

          if (incoming.protocol !== allowed.protocol) continue;
          if (incoming.port !== allowed.port) continue;

          const allowedHost = allowed.hostname;
          const incomingHost = incoming.hostname;
          if (incomingHost === allowedHost) continue; // requires subdomain
          if (incomingHost.endsWith(`.${allowedHost}`)) return callback(null, true);
        } catch {
          // ignore invalid patterns
        }
      }

      // Convenience: if you configured apex domain, allow its www variant (and vice-versa).
      try {
        const incoming = new URL(normalizedOrigin);
        const incomingHost = incoming.hostname;

        const wwwToggledHost = incomingHost.startsWith('www.')
          ? incomingHost.slice(4)
          : `www.${incomingHost}`;
        const toggledOrigin = `${incoming.protocol}//${wwwToggledHost}${
          incoming.port ? `:${incoming.port}` : ''
        }`;

        if (allowedOrigins.includes(toggledOrigin)) return callback(null, true);
      } catch {
        // ignore invalid origins
      }

      // Do not throw here: passing an Error causes a 500 response which can be confusing during CORS debugging.
      // Returning `false` omits CORS headers, which correctly blocks the browser while keeping the status code stable.
      return callback(null, false);
    },
    credentials: true,
    optionsSuccessStatus: 204,
  });

  const port = configService.get('PORT') || 3002;

  // Explicitly bind to all interfaces (required by some PaaS port scanners).
  await app.listen(port, '0.0.0.0');

  if (!isProd) {
    new Logger('Bootstrap').log(`TzDraft server listening on port ${port}`);
  }
}
bootstrap();
