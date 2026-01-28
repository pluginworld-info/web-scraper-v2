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

  // 3. Allow images from external retailers and your own GCS bucket
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "media.sweetwater.com" },
      { protocol: "https", hostname: "cdn.pluginboutique.com" },
      { protocol: "https", hostname: "static.kvraudio.com" },
      { protocol: "https", hostname: "audioplugin.deals" },
      { protocol: "https", hostname: "*.audioplugin.deals" },
      // ADDED: Google Cloud Storage Bucket domain
      { 
        protocol: "https", 
        hostname: "storage.googleapis.com", 
        pathname: "/plugin-scraper-images/**" 
      },
    ],
  },
};

export default nextConfig;