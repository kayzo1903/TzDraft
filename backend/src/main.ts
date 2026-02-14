import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import { json, urlencoded } from 'express';

async function bootstrap() {
  const isProd = process.env.NODE_ENV === 'production';

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: isProd ? false : undefined,
    bodyParser: false,
  });

  const configService = app.get(ConfigService);

  // 1. Trust Proxy - Crucial for Render/Load Balancers
  app.set('trust proxy', 1);

  // 2. Enable CORS - MUST be before Body Parser
  const corsOriginsRaw =
    configService.get<string>('CORS_ORIGINS') ||
    configService.get<string>('CORS_ORIGIN') ||
    configService.get<string>('FRONTEND_URL') ||
    configService.get<string>('APP_URL') ||
    'http://localhost:3000';

  // Normalize origins: ensure they have protocols.
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
    .filter(Boolean)
    .flatMap((origin) => {
      if (origin === '*') return ['*'];
      if (origin.startsWith('http://') || origin.startsWith('https://')) {
        return [origin];
      }
      return [`https://${origin}`, `http://${origin}`];
    });

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      const normalizedOrigin = origin.replace(/\/$/, '');
      if (allowedOrigins.includes('*')) return callback(null, true);
      if (allowedOrigins.includes(normalizedOrigin))
        return callback(null, true);

      for (const allowedOrigin of allowedOrigins) {
        if (!allowedOrigin.includes('*')) continue;
        try {
          const allowed = new URL(allowedOrigin.replace('*.', ''));
          const incoming = new URL(normalizedOrigin);
          if (incoming.protocol !== allowed.protocol) continue;
          if (incoming.port !== allowed.port) continue;
          const allowedHost = allowed.hostname;
          const incomingHost = incoming.hostname;
          if (incomingHost === allowedHost) continue;
          if (incomingHost.endsWith(`.${allowedHost}`))
            return callback(null, true);
        } catch {}
      }

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
      } catch {}

      return callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    optionsSuccessStatus: 204,
  });

  // 3. Body Parsers - After CORS
  app.use(
    json({
      limit: '1mb',
      verify: (req: any, res, buf) => {
        if (
          req.url &&
          req.url.includes('/auth/login') &&
          process.env.AUTH_DEBUG_LOG === 'true'
        ) {
          console.log(
            '[DEBUG_VERIFY] Raw buffer received, length:',
            buf.length,
          );
        }
      },
    }),
  );
  app.use(urlencoded({ extended: true }));

  // 4. Debug Logger
  app.use('/auth/login', (req, _res, next) => {
    if (process.env.AUTH_DEBUG_LOG === 'true') {
      const body = req.body as Record<string, unknown> | undefined;
      console.log(
        '[AUTH_LOGIN_DEBUG]',
        JSON.stringify({
          logVersion: 'v7-robust-config',
          method: req.method,
          path: req.path,
          origin: req.headers.origin,
          contentType: req.headers['content-type'],
          contentLength: req.headers['content-length'],
          bodyType: body === null ? 'null' : typeof body,
          bodyKeys: body && typeof body === 'object' ? Object.keys(body) : null,
        }),
      );
    }
    next();
  });

  // 5. Global Pipes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const port = configService.get('PORT') || 3002;

  // Explicitly bind to all interfaces
  await app.listen(port, '0.0.0.0');

  if (!isProd) {
    new Logger('Bootstrap').log(`TzDraft server listening on port ${port}`);
  }
}
bootstrap();
