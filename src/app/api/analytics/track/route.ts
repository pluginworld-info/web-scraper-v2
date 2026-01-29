import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/db/prisma'; // UPDATED: Points to your actual file location

export async function POST(req: Request) {
  const body = await req.json();
  const { type, data } = body;

  // FIX: await cookies() for Next.js 15 support
  const cookieStore = await cookies();
  let guestId = cookieStore.get('guest_session_id')?.value;

  // Fallback: If middleware somehow missed it, generate one here
  if (!guestId) {
    guestId = crypto.randomUUID();
  }

  // 2. Resolve User Identity (Placeholder for your Auth)
  const userId = null; 

  try {
    // --- EVENT TYPE: SEARCH ---
    if (type === 'SEARCH') {
      await prisma.searchLog.create({
        data: {
          query: data.query,
          resultsCount: data.resultsCount,
          guestId: guestId,
          userId: userId,
        },
      });
    } 
    
    // --- EVENT TYPE: CLICK (Product View) ---
    else if (type === 'CLICK') {
      await prisma.productView.create({
        data: {
          productId: data.productId,
          source: data.source || 'direct',
          guestId: guestId,
          userId: userId,
        },
      });
    }

    // --- EVENT TYPE: WISHLIST ---
    else if (type === 'WISHLIST') {
      if (userId) {
        // For Logged-in Users
        await prisma.wishlistItem.upsert({
          where: {
            userId_productId: {
              userId: userId,
              productId: data.productId,
            },
          },
          update: {}, 
          create: {
            productId: data.productId,
            userId: userId,
            guestId: guestId,
          },
        });
      } else {
        // For Guests
        const existing = await prisma.wishlistItem.findFirst({
          where: {
            productId: data.productId,
            guestId: guestId,
            userId: null, 
          },
        });

        if (!existing) {
          await prisma.wishlistItem.create({
            data: {
              productId: data.productId,
              guestId: guestId,
            },
          });
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Analytics Error:", error);
    return NextResponse.json({ success: false }, { status: 200 });
  }
}