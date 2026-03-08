// Sentry must be initialized before any other imports
import './instrument';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { Logger } from 'nestjs-pino';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import { json, urlencoded } from 'express';
import helmet from 'helmet';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    // Disable NestJS built-in logger — nestjs-pino (configured in AppModule) takes over
    logger: false,
    bodyParser: false,
  });

  // Wire in the pino logger so all NestJS Logger calls go through pino
  app.useLogger(app.get(Logger));

  const configService = app.get(ConfigService);

  // 1. Trust Proxy - Crucial for Render/Load Balancers
  app.set('trust proxy', 1);

  // 1b. Security headers
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: ["'self'"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          mediaSrc: ["'self'"],
          frameSrc: ["'none'"],
        },
      },
      crossOriginEmbedderPolicy: false, // allows cross-origin embeds (socket.io needs this)
    }),
  );

  // 1c. Global exception filter — prevents stack trace leakage
  app.useGlobalFilters(new AllExceptionsFilter());

  // 2. Enable CORS - MUST be before Body Parser
  // CORS_ORIGINS is required — env validation already guarantees it is set.
  const corsOriginsRaw = configService.getOrThrow<string>('CORS_ORIGINS');

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

  // 3. Custom Body Parser (Render Fix)
  // express.json() was mysteriously skipping requests on Render despite correct headers.
  // This custom implementation bypasses the Content-Type checking quirks.
  app.use((req: any, res, next) => {
    const contentType = req.headers['content-type'] || '';

    // Only handle JSON requests
    if (!contentType.toLowerCase().includes('json')) {
      return next();
    }

    const chunks: Buffer[] = [];
    let totalSize = 0;
    const MAX_SIZE = 1024 * 1024; // 1MB limit

    req.on('data', (chunk: Buffer) => {
      totalSize += chunk.length;
      if (totalSize > MAX_SIZE) {
        req.removeAllListeners('data');
        req.removeAllListeners('end');
        res.status(413).json({ error: 'Payload too large' });
        return;
      }
      chunks.push(chunk);
    });

    req.on('end', () => {
      try {
        const raw = Buffer.concat(chunks).toString('utf8');

        if (
          process.env.AUTH_DEBUG_LOG === 'true' &&
          req.url?.includes('/auth/login')
        ) {
          console.log('[CUSTOM_PARSER] Raw buffer length:', raw.length);
        }

        if (raw.length === 0) {
          req.body = {};
        } else {
          req.body = JSON.parse(raw);
        }

        next();
      } catch (err) {
        console.error('[CUSTOM_PARSER] JSON parse error:', err);
        res.status(400).json({ error: 'Invalid JSON' });
      }
    });

    req.on('error', (err) => {
      console.error('[CUSTOM_PARSER] Stream error:', err);
      res.status(400).json({ error: 'Request error' });
    });
  });

  app.use(urlencoded({ extended: true }));

  // 4. Global Pipes
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

  app.get(Logger).log(`TzDraft server listening on port ${port}`, 'Bootstrap');
}
bootstrap();
