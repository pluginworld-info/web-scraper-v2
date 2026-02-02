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
      logoUrl: ""
    });

  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // Upsert: Update if exists, Create if not
    // We use a fixed ID or findFirst to ensure we only have one settings row
    const firstSetting = await prisma.siteSettings.findFirst();
    
    const settings = await prisma.siteSettings.upsert({
      where: { id: firstSetting?.id || "default-id" },
      update: {
        siteName: body.siteName,
        logoUrl: body.logoUrl,
        primaryColor: body.primaryColor,
        accentColor: body.accentColor
      },
      create: {
        siteName: body.siteName,
        logoUrl: body.logoUrl,
        primaryColor: body.primaryColor,
        accentColor: body.accentColor
      }
    });

    // Purge the cache so the new logo/colors show up immediately on the homepage
    revalidatePath('/', 'layout');

    return NextResponse.json({ success: true, settings });

  } catch (error) {
    console.error("Settings Error:", error);
    return NextResponse.json({ error: "Failed to save settings" }, { status: 500 });
  }
}