import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 1. Enable Standalone output (Required for Docker)
  output: "standalone",

  // 2. TELL NEXT.JS NOT TO BUNDLE THESE LIBRARIES
  serverExternalPackages: [
    'puppeteer', 
    'puppeteer-extra', 
    'puppeteer-extra-plugin-stealth', 
    'cheerio'
  ],

  // 3. Allow images from external retailers
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "media.sweetwater.com" },
      { protocol: "https", hostname: "cdn.pluginboutique.com" },
      { protocol: "https", hostname: "static.kvraudio.com" },
    ],
  },
};

export default nextConfig;