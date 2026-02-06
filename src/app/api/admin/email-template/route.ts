import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

// FETCH TEMPLATE
export async function GET() {
  try {
    let template = await prisma.emailTemplate.findFirst();
    
    // Create default if none exists
    if (!template) {
      template = await prisma.emailTemplate.create({
        data: {
          subject: "Price Alert Triggered: {{product_name}}",
          bodyHtml: "<p>Your price alert has been triggered for {{product_name}}!</p>"
        }
      });
    }
    
    return NextResponse.json(template);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch template" }, { status: 500 });
  }
}

// SAVE TEMPLATE
export async function POST(req: Request) {
  try {
    const data = await req.json();
    const existing = await prisma.emailTemplate.findFirst();

    if (existing) {
      await prisma.emailTemplate.update({
        where: { id: existing.id },
        data: {
          headerImageUrl: data.headerImageUrl,
          footerImageUrl: data.footerImageUrl,
          subject: data.subject,
          bodyHtml: data.bodyHtml,
        }
      });
    } else {
      await prisma.emailTemplate.create({ data });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to save template" }, { status: 500 });
  }
}