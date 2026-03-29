import path from "node:path";
import createNextIntlPlugin from "next-intl/plugin";

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

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    externalDir: true,
  },
  async headers() {
    return [
      {
        // Private user/admin areas should never be indexed, even if linked.
        source: "/(sw|en)/(auth|game|admin|profile|settings)/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" }],
      },
      {
        // API responses should not appear as indexed documents.
        source: "/api/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" }],
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.sanity.io",
      },
    ],
  },
  transpilePackages: ["@tzdraft/shared-client"],
  turbopack: {
    root: path.resolve(__dirname, ".."),
  },
  webpack: (config: any) => {
    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      "@tzdraft/mkaguzi-engine": path.resolve(
        __dirname,
        "../packages/mkaguzi-engine/dist",
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

function withOptionalSentry(config: NextConfig): NextConfig {
  if (!process.env.SENTRY_AUTH_TOKEN) {
    return config;
  }

  try {
    // Keep Sentry integration optional at build time so missing dependency
    // does not break production deploys.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { withSentryConfig } = require("@sentry/nextjs") as {
      withSentryConfig: (cfg: NextConfig, options: Record<string, unknown>) => NextConfig;
    };

    return withSentryConfig(config, {
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      silent: !process.env.CI,
      widenClientFileUpload: true,
      hideSourceMaps: true,
      disableLogger: true,
    });
  } catch {
    // eslint-disable-next-line no-console
    console.warn(
      "SENTRY_AUTH_TOKEN is set, but @sentry/nextjs is unavailable. Continuing without Sentry build wrapping.",
    );
    return config;
  }
}

export default withOptionalSentry(baseConfig);
