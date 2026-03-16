import path from "node:path";
import createNextIntlPlugin from "next-intl/plugin";
import { withSentryConfig } from "@sentry/nextjs";

const withNextIntl = createNextIntlPlugin();

// `next build` always runs with NODE_ENV=production, even for local verification.
// Enforce real production URLs only for CI/deployment builds where those env vars
// should come from the target environment instead of a local `.env`.
const isDeploymentBuild =
  process.env.NODE_ENV === "production" &&
  (process.env.CI === "true" ||
    process.env.GITHUB_ACTIONS === "true" ||
    process.env.VERCEL === "1");

if (isDeploymentBuild) {
  const required = ["NEXT_PUBLIC_API_URL", "NEXT_PUBLIC_BETTER_AUTH_URL"];

  const missing = required.filter((k) => !process.env[k]);
  if (missing.length > 0) {
    throw new Error(
      `❌ Missing required build-time env vars: ${missing.join(", ")}. ` +
        `Set them in GitHub Actions → Environments → production → Variables.`,
    );
  }

  const localhostVars = required.filter((k) =>
    (process.env[k] ?? "").includes("localhost"),
  );
  if (localhostVars.length > 0) {
    throw new Error(
      `❌ Build-time env vars contain localhost in production: ${localhostVars.join(", ")}. ` +
        `These must be real domain URLs.`,
    );
  }
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    externalDir: true,
  },
  transpilePackages: ["@tzdraft/shared-client"],
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
      "@tzdraft/shared-client": path.resolve(
        __dirname,
        "../packages/shared-client/src/index.ts",
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
