import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

// 1. GET: List all feeds grouped by Retailer
export async function GET() {
  try {
    const retailers = await prisma.retailer.findMany({
      include: {
        feeds: true // Include the new Feed relation
      },
      orderBy: { name: 'asc' }
    });
    
    // Filter out retailers that don't have feeds if you want to be strict, 
    // but usually seeing empty retailers is good for debugging.
    return NextResponse.json(retailers);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch feeds" }, { status: 500 });
  }
}

// 2. POST: Add a new Site (Retailer) + Feed
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, url, type, role } = body;

    // A. Check if Retailer exists, or create one
    // We use 'upsert' to be safe, but since 'name' is unique, we can findOrCreate logic
    let retailer = await prisma.retailer.findUnique({
      where: { name: name }
    });

    if (!retailer) {
      retailer = await prisma.retailer.create({
        data: {
          name,
          domain: new URL(url).hostname, // Auto-extract domain from feed URL
          role: role || 'SPOKE'
        }
      });
    }

    // B. Create the Feed Entry
    const feed = await prisma.feed.create({
      data: {
        name: `${name} ${type} Feed`,
        url,
        type: type || 'JSON',
        status: 'IDLE',
        retailerId: retailer.id
      }
    });

    return NextResponse.json(feed);
  } catch (error) {
    console.error("Create Feed Error:", error);
    return NextResponse.json({ error: "Failed to create feed" }, { status: 500 });
  }
}

// 3. DELETE: Remove a Feed
export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

  try {
    await prisma.feed.delete({
      where: { id }
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}