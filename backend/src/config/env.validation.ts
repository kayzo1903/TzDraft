/**
 * Validates required environment variables at startup.
 * Called by ConfigModule.forRoot({ validate }) — throws if any required var is missing or invalid.
 *
 * Rules:
 *  - Required vars must be present and non-empty in every environment.
 *  - URL vars must not contain "localhost" when NODE_ENV=production.
 *    This makes it structurally impossible to deploy with localhost URLs.
 */
export function validateEnv(
  config: Record<string, unknown>,
): Record<string, unknown> {
  const isProd = config['NODE_ENV'] === 'production';

  // ── Required in every environment ─────────────────────────────────────────
  const required = [
    'DATABASE_URL',
    'JWT_SECRET',
    'JWT_REFRESH_SECRET',
    'CORS_ORIGINS',
    'FRONTEND_URL',
  ];

  // REDIS_URL is required in production but optional in development.
  // In dev, all Redis-dependent features (matchmaking queue, WS adapter) fall
  // back to in-memory / Prisma implementations automatically.
  if (isProd) {
    required.push('REDIS_URL');
  }

  const missing = required.filter((key) => !config[key]);
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}. ` +
        `Copy .env.example to .env and fill in the values.`,
    );
  }

  // ── Production: URL vars must never contain localhost ──────────────────────
  if (isProd) {
    const urlVars = ['FRONTEND_URL', 'BACKEND_URL', 'APP_URL', 'CORS_ORIGINS'];
    const localhostVars = urlVars.filter((key) => {
      const val = config[key] as string | undefined;
      return val && val.includes('localhost');
    });

    if (localhostVars.length > 0) {
      throw new Error(
        `Environment variables contain localhost URLs in production: ${localhostVars.join(', ')}. ` +
          `Set them to your real domain URLs.`,
      );
    }
  }

  return config;
}
