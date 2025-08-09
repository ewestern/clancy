import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  async rewrites() {
    return [
      {
        source: "/ph-relay-8437f/static/:path*",
        destination: "https://us-assets.i.posthog.com/static/:path*",
      },
      {
        source: "/ph-relay-8437f/:path*",
        destination: "https://us.i.posthog.com/:path*",
      },
      {
        source: "/ph-relay-8437f/flags",
        destination: "https://us.i.posthog.com/flags",
      },
    ];
  },
  //// Required to support PostHog trailing slash API requests
  skipTrailingSlashRedirect: true,
};

export default nextConfig;
