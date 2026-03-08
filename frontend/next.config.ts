import path from "node:path";
import createNextIntlPlugin from "next-intl/plugin";
import { withSentryConfig } from "@sentry/nextjs";

const withNextIntl = createNextIntlPlugin();

if (
  process.env.NODE_ENV === "production" &&
  (!process.env.NEXT_PUBLIC_API_URL || !process.env.NEXT_PUBLIC_BETTER_AUTH_URL)
) {
  throw new Error(
    "❌ Missing required NEXT_PUBLIC_API_URL or NEXT_PUBLIC_BETTER_AUTH_URL environment variables during build.",
  );
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    externalDir: true,
  },
  turbopack: {
    root: path.resolve(__dirname, ".."),
  },
  webpack: (config: any) => {
    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      "@tzdraft/cake-engine": path.resolve(
        __dirname,
        "../packages/cake-engine/dist",
      ),
    };
    return config;
  },
};

// Wrap with Sentry only in CI when SENTRY_AUTH_TOKEN is present (source-map upload).
// In local dev and Docker builds the Sentry SDK still initialises at runtime via
// sentry.client.config.ts / sentry.server.config.ts — no build-time wrapping needed.
const baseConfig = withNextIntl(nextConfig);

export default process.env.SENTRY_AUTH_TOKEN
  ? withSentryConfig(baseConfig, {
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      silent: !process.env.CI,
      widenClientFileUpload: true,
      hideSourceMaps: true,
      disableLogger: true,
    })
  : baseConfig;
