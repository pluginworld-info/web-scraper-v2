import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 1. Enable Standalone output (Shrinks Docker image size drastically)
  output: "standalone",

  // 2. Allow images from external retailers (for your dashboard)
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "media.sweetwater.com" },
      { protocol: "https", hostname: "cdn.pluginboutique.com" },
      { protocol: "https", hostname: "static.kvraudio.com" }, // Common for audio plugins
      // Add other retailer image domains here as you discover them
    ],
  },
};

export default nextConfig;