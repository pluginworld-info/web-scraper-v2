import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> } // ⚡ FIX: Added Promise wrapper
) {
  try {
    const feedId = (await params).id; // ⚡ FIX: Awaited params before reading ID

    // We ONLY select the two number fields to make this query lightning fast
    const progress = await prisma.feed.findUnique({
      where: { id: feedId },
      select: {
        totalItems: true,
        processedItems: true,
      },
    });

    if (!progress) {
      return NextResponse.json({ error: 'Feed not found' }, { status: 404 });
    }

    // Tells the browser not to cache this specific response so the progress bar actually moves
    return NextResponse.json(progress, {
        headers: {
            'Cache-Control': 'no-store, max-age=0',
        }
    });

  } catch (error) {
    console.error('Failed to fetch feed progress:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}