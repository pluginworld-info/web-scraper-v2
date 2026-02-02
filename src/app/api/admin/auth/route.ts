import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { password } = body;

    // 1. Check against Environment Variable
    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

    if (!ADMIN_PASSWORD) {
      console.error("CRITICAL: ADMIN_PASSWORD not set in Cloud Run variables.");
      return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
    }

    if (password !== ADMIN_PASSWORD) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    // 2. Success! Set the Secure Cookie
    // ✅ FIX: "await" the cookies() function before setting
    const cookieStore = await cookies();
    
    cookieStore.set('admin_session', 'authenticated_active_session', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24, // 24 Hours
      path: '/',
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("Auth Error:", error); // Added logging for debugging
    return NextResponse.json({ error: "Auth failed" }, { status: 500 });
  }
}