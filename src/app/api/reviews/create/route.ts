import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

// ⚡ SECURITY HELPER: Neutralizes HTML and Scripts
function sanitize(text: string) {
  if (!text) return '';
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
    .trim();
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { productId, rating, comment, authorName, cf_token, hp_field } = body;

    // ⚡ 1. HONEYPOT CHECK: If field is filled, it's a bot.
    if (hp_field && hp_field !== '') {
        console.warn("🚫 Bot detected via Honeypot Trap.");
        return NextResponse.json({ error: 'System busy. Please try again later.' }, { status: 403 });
    }

    // ⚡ 2. CLOUDFLARE TURNSTILE VERIFICATION
    if (!cf_token) {
        return NextResponse.json({ error: 'Security token missing' }, { status: 400 });
    }

    const verifyRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        secret: process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY!,
        response: cf_token,
      }),
    });

    const verifyData = await verifyRes.json();
    if (!verifyData.success) {
      return NextResponse.json({ error: 'Security check failed. Please refresh.' }, { status: 403 });
    }

    // 3. Validation
    if (!productId || rating === undefined || rating === null) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const numericRating = Number(rating);
    if (isNaN(numericRating) || numericRating < 1 || numericRating > 5) {
        return NextResponse.json({ error: 'Rating must be between 1 and 5' }, { status: 400 });
    }

    // 4. Sanitization
    const safeComment = sanitize(comment).substring(0, 1000);
    const safeAuthorName = sanitize(authorName || 'Guest').substring(0, 50);

    // 5. Save to Database
    const review = await prisma.review.create({
      data: {
        rating: numericRating,
        comment: safeComment,
        authorName: safeAuthorName,
        product: { connect: { id: productId } }
      }
    });

    return NextResponse.json({ success: true, review });

  } catch (error: any) {
    console.error('Review Error:', error);
    return NextResponse.json({ error: 'Failed to save review' }, { status: 500 });
  }
}