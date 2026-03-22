import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { password, cf_token } = body; // ⚡ NEW: Extract token

    // ⚡ 1. CLOUDFLARE TURNSTILE VERIFICATION
    if (!cf_token) {
      return NextResponse.json({ error: "Security check missing" }, { status: 400 });
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
      return NextResponse.json({ error: "Security check failed. Refresh and try again." }, { status: 403 });
    }

    // 2. Check against Environment Variable
    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

    if (!ADMIN_PASSWORD) {
      console.error("CRITICAL: ADMIN_PASSWORD not set in Cloud Run variables.");
      return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 });
    }

    if (password !== ADMIN_PASSWORD) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    // 3. Success! Set the Secure Cookie
    // ✅ FIX: "await" the cookies() function for Next.js 15
    const cookieStore = await cookies();
    
    cookieStore.set('admin_session', 'authenticated_active_session', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24, // 24 Hours
      path: '/',
      sameSite: 'lax'
    });

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("Auth Error:", error);
    return NextResponse.json({ error: "Auth failed" }, { status: 500 });
  }
}