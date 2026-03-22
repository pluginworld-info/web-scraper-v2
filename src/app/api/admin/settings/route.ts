import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { revalidatePath } from 'next/cache';

// Force dynamic so we always get the latest settings
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const settings = await prisma.siteSettings.findFirst();
    
    // Return existing settings or defaults
    return NextResponse.json(settings || {
      siteName: "PluginDeals",
      primaryColor: "#2563eb",
      accentColor: "#ef4444",
      logoUrl: "",
      faviconUrl: "",
      // ⚡ ADDED: Hero Fallbacks
      heroBgUrl: "",
      heroTagline: "Live Price Tracking From Around The World",
      heroTitle: "Compare Plugin Deals",
      heroSubtitle: "Real-time Price Monitoring From The World's Best Audio Software Sellers. Compare Thousands Of Plugins And Buy Smart.",
      heroOverlayColor: "rgba(0, 0, 0, 0.7)",
      // ⚡ NEW: Hero Style & SEO Fallbacks
      heroOverlayBlur: 2,
      heroBorderColor: "rgba(255, 255, 255, 0.05)",
      heroBorderThickness: 1,
      metaTitle: "Plugin Deals & VST Sales",
      metaDescription: "Real-time price monitoring from the world's best audio software sellers.",
      metaKeywords: "audio plugins, vst plugins, plugin deals, music production, synthesizers"
    });

  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // Upsert: Update if exists, Create if not
    const firstSetting = await prisma.siteSettings.findFirst();
    
    const settings = await prisma.siteSettings.upsert({
      where: { id: firstSetting?.id || "default-id" },
      update: {
        siteName: body.siteName,
        logoUrl: body.logoUrl,
        faviconUrl: body.faviconUrl,
        primaryColor: body.primaryColor,
        accentColor: body.accentColor,
        // ⚡ ADDED: Map the Hero fields to update
        heroBgUrl: body.heroBgUrl,
        heroTagline: body.heroTagline,
        heroTitle: body.heroTitle,
        heroSubtitle: body.heroSubtitle,
        heroOverlayColor: body.heroOverlayColor,
        // ⚡ NEW: Map new style & SEO fields
        heroOverlayBlur: body.heroOverlayBlur ? parseInt(body.heroOverlayBlur.toString()) : 0,
        heroBorderColor: body.heroBorderColor,
        heroBorderThickness: body.heroBorderThickness ? parseInt(body.heroBorderThickness.toString()) : 0,
        metaTitle: body.metaTitle,
        metaDescription: body.metaDescription,
        metaKeywords: body.metaKeywords
      },
      create: {
        siteName: body.siteName,
        logoUrl: body.logoUrl,
        faviconUrl: body.faviconUrl,
        primaryColor: body.primaryColor,
        accentColor: body.accentColor,
        // ⚡ ADDED: Map the Hero fields to create
        heroBgUrl: body.heroBgUrl,
        heroTagline: body.heroTagline,
        heroTitle: body.heroTitle,
        heroSubtitle: body.heroSubtitle,
        heroOverlayColor: body.heroOverlayColor,
        // ⚡ NEW: Map new style & SEO fields
        heroOverlayBlur: body.heroOverlayBlur ? parseInt(body.heroOverlayBlur.toString()) : 0,
        heroBorderColor: body.heroBorderColor,
        heroBorderThickness: body.heroBorderThickness ? parseInt(body.heroBorderThickness.toString()) : 0,
        metaTitle: body.metaTitle,
        metaDescription: body.metaDescription,
        metaKeywords: body.metaKeywords
      }
    });

    // Purge the cache so the new logo/colors/hero show up immediately on the homepage
    revalidatePath('/', 'layout');

    return NextResponse.json({ success: true, settings });

  } catch (error) {
    console.error("Settings Error:", error);
    return NextResponse.json({ error: "Failed to save settings" }, { status: 500 });
  }
}