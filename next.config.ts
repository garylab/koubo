import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: __dirname,
};

// Emulate Cloudflare bindings only in `next dev`. During `next build`
// (incl. CF Workers Builds) there's no local Hyperdrive conn string and
// the emulator would throw an unhandledRejection.
if (process.env.NODE_ENV !== "production") {
  initOpenNextCloudflareForDev();
}

export default nextConfig;
