import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { product_url, product_title, target_price, email } = body;

    // Validation
    if (!product_url || !product_title || !target_price || !email) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    const numericTarget = Number(target_price);
    if (isNaN(numericTarget) || numericTarget <= 0) {
      return NextResponse.json({ error: 'Invalid target price' }, { status: 400 });
    }

    // Save to Firestore
    await db.collection('alerts').add({
      product_url,
      product_title,
      target_price: numericTarget,
      email,
      active: true,
      fulfilled: false,
      triggered: false,
      last_checked_price: null,
      last_checked_at: null,
      created_at: new Date(), // Firebase Admin handles dates correctly
      retry_count: 0
    });

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('🔥 Alert Creation Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}