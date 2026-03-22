import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> } // ⚡ FIX: Added Promise wrapper
) {
  try {
    const feedId = (await params).id; // ⚡ FIX: Awaited params before reading ID

    // Flip the status back to IDLE. 
    // The running sync engine will catch this flag and safely break its loop.
    const updatedFeed = await prisma.feed.update({
      where: { id: feedId },
      data: { status: 'IDLE' },
    });

    return NextResponse.json({ success: true, status: updatedFeed.status });

  } catch (error) {
    console.error('Failed to abort feed sync:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}