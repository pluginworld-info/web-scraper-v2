import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

// ⚡ SECURITY HELPER: Neutralizes HTML and Scripts (Prevents XSS / Malware)
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
    const { productId, rating, comment, authorName } = body;

    // 1. Basic Validation
    if (!productId || rating === undefined || rating === null) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // 2. BOUNDS CHECKING: Ensure rating is strictly between 1 and 5
    const numericRating = Number(rating);
    if (isNaN(numericRating) || numericRating < 1 || numericRating > 5) {
        return NextResponse.json({ error: 'Rating must be between 1 and 5' }, { status: 400 });
    }

    // 3. SANITIZATION & LIMITS: Neutralize scripts and cap lengths to stop database bloat
    const safeComment = sanitize(comment).substring(0, 1000); // Max 1000 characters
    const safeAuthorName = sanitize(authorName || 'Guest').substring(0, 50); // Max 50 characters

    // 4. Save to Database securely
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