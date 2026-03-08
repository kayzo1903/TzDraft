/**
 * Validates required environment variables at startup.
 * Called by ConfigModule.forRoot({ validate }) — throws if any required var is missing.
 */
export function validateEnv(config: Record<string, unknown>): Record<string, unknown> {
  const required = [
    'DATABASE_URL',
    'JWT_SECRET',
    'REDIS_URL',
    'CORS_ORIGINS',
  ];

  const missing = required.filter((key) => !config[key]);

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}. ` +
        `Copy .env.example to .env and fill in the values.`,
    );
  }

  // Warn about optional-but-recommended vars
  const recommended = ['SENTRY_DSN', 'FRONTEND_URL', 'BETTER_AUTH_SECRET'];
  const missingRecommended = recommended.filter((key) => !config[key]);
  if (missingRecommended.length > 0 && config['NODE_ENV'] === 'production') {
    console.warn(
      `[Config] Recommended production env vars not set: ${missingRecommended.join(', ')}`,
    );
  }

  return config;
}
