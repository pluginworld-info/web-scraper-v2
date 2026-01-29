import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // 1. Create a response object that allows the request to continue
  const response = NextResponse.next();

  // 2. Check if the guest session cookie already exists
  const guestSessionId = request.cookies.get('guest_session_id')?.value;

  // 3. If missing, generate a new ID and set the cookie
  if (!guestSessionId) {
    // Generate a unique ID
    const newSessionId = crypto.randomUUID();

    // Set the cookie on the response
    response.cookies.set('guest_session_id', newSessionId, {
      path: '/',                    // Available across the whole site
      maxAge: 60 * 60 * 24 * 365,   // Persist for 1 year
      httpOnly: true,               // Security: Not accessible via client-side JS
      secure: process.env.NODE_ENV === 'production', // Only send over HTTPS in prod
      sameSite: 'lax',
    });
  }

  return response;
}

// Configure which paths the middleware runs on
export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * 1. /_next/ (Next.js internals)
     * 2. /static (inside /public)
     * 3. /favicon.ico, /sitemap.xml (static files)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};