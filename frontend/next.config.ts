import path from "node:path";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin();

// `next build` always runs with NODE_ENV=production, even for local verification.
// Enforce real production URLs only for actual deployment builds where those env
// vars are baked into the JS bundle via --build-arg (deploy.yml).
//
// We deliberately skip this guard in CI smoke-test docker builds (ci.yml
// docker-build-check job) which intentionally omit NEXT_PUBLIC_API_URL so that
// the check stays fast without requiring production credentials.
const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "";
const isDeploymentBuild =
  process.env.NODE_ENV === "production" &&
  apiUrl.length > 0 && // only enforce when the URL was explicitly provided
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
    const isProd = process.env.NODE_ENV === "production";

    // Security headers applied to every response from the Next.js server
    const securityHeaders = [
      // Prevent browsers from MIME-sniffing the content type
      { key: "X-Content-Type-Options", value: "nosniff" },
      // Block this site from being embedded in iframes (clickjacking)
      { key: "X-Frame-Options", value: "DENY" },
      // Don't leak the full URL in the Referer header to third parties
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      // Disable browser features the app doesn't use
      {
        key: "Permissions-Policy",
        value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
      },
      // HSTS: force HTTPS for 1 year (production only — breaks local HTTP dev)
      ...(isProd
        ? [
            {
              key: "Strict-Transport-Security",
              value: "max-age=31536000; includeSubDomains; preload",
            },
          ]
        : []),
    ];

    return [
      {
        // Apply security headers to all routes
        source: "/:path*",
        headers: securityHeaders,
      },
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
      {
        // apple-app-site-association has no .json extension but must be served
        // as application/json for iOS Universal Links verification to pass.
        source: "/.well-known/apple-app-site-association",
        headers: [{ key: "Content-Type", value: "application/json" }],
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.sanity.io",
      },
      {
        protocol: "https",
        hostname: "pub-45c6d761a8e341418a3286f116654f56.r2.dev",
      },
    ],
  },
  transpilePackages: ["@tzdraft/shared-client", "@tzdraft/translations"],
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
