import path from "node:path";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin();

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    externalDir: true,
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

export default withNextIntl(nextConfig);
