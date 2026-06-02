import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

// New build ID per deploy. Used to bust the service worker cache so PWA users
// pick up new code automatically. Falls back to Date.now() in local dev.
const BUILD_ID = process.env.BUILD_ID || Date.now().toString();

const nextConfig: NextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: __dirname,
  // Allow the Cloudflare tunnel host to talk to the Next.js dev server
  // (HMR/_next/* requests come with that Host header).
  allowedDevOrigins: ["koubo-dev.garymeng.com"],
  generateBuildId: async () => BUILD_ID,
  env: { NEXT_PUBLIC_BUILD_ID: BUILD_ID },
  // Disable Next's client-side router cache for dynamic pages so navigating
  // back to a page (e.g. /scripts after autosaving in the editor) re-fetches
  // fresh server data instead of showing a stale RSC payload.
  experimental: {
    staleTimes: { dynamic: 0, static: 0 },
  },
};

// Emulate Cloudflare bindings only in `next dev`. During `next build`
// (incl. CF Workers Builds) there's no local Hyperdrive conn string and
// the emulator would throw an unhandledRejection.
if (process.env.NODE_ENV !== "production") {
  initOpenNextCloudflareForDev();
}

export default nextConfig;
