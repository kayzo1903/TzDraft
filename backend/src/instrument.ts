// This file MUST be imported as the very first import in main.ts so Sentry
// can instrument all subsequent require() calls (NestJS modules, Prisma, etc.)
import * as Sentry from '@sentry/nestjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 0.1,
  environment: process.env.NODE_ENV || 'development',
  // Disable Sentry entirely when no DSN is set (local dev without Sentry account)
  enabled: !!process.env.SENTRY_DSN,
});
