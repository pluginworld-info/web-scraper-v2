import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // 1. Parse the requested URL
  const pathname = request.nextUrl.pathname;
  
  // ⚡ FIX: Differentiate between frontend UI paths and backend API paths
  const isUiAdminPath = pathname.startsWith('/admin');
  const isApiAdminPath = pathname.startsWith('/api/admin');
  const isLoginPath = pathname === '/admin/login';

  const authToken = request.cookies.get('admin_session')?.value;

  // --- 2. API ADMIN AUTHENTICATION LOGIC ---
  // If trying to access a secure API route without a token, instantly block it.
  if (isApiAdminPath && !authToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // --- 3. UI ADMIN AUTHENTICATION LOGIC ---
  if (isUiAdminPath) {
    // LOGIC A: If trying to access Admin but NOT logged in -> Redirect to Login
    if (!isLoginPath && !authToken) {
      const loginUrl = new URL('/admin/login', request.url);
      return NextResponse.redirect(loginUrl);
    } 
    // LOGIC B: If already logged in but trying to access Login -> Redirect to Dashboard
    else if (isLoginPath && authToken) {
      const dashboardUrl = new URL('/admin', request.url);
      return NextResponse.redirect(dashboardUrl);
    }
  }

  // 4. Establish the default response (allow the request to continue)
  const response = NextResponse.next();

  // --- 5. GUEST SESSION LOGIC ---
  // We run this on ALL routes to ensure frontend tracking works perfectly
  const guestSessionId = request.cookies.get('guest_session_id')?.value;

  // If missing, generate a new ID and attach it to our 'response' object
  if (!guestSessionId) {
    const newSessionId = crypto.randomUUID();

    response.cookies.set('guest_session_id', newSessionId, {
      path: '/',                    // Available across the whole site
      maxAge: 60 * 60 * 24 * 365,   // Persist for 1 year
      httpOnly: true,               // Security: Not accessible via client-side JS
      secure: process.env.NODE_ENV === 'production', // Only send over HTTPS in prod
      sameSite: 'lax',
    });
  }

  // 6. Return the single, final response to Next.js
  return response;
}

// Configuration: Run on all paths EXCEPT Next.js internals and static assets
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};