import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {

  
  // 1. Establish the default response (allow the request to continue)
  let response = NextResponse.next();

  // 2. Parse the requested URL
  const pathname = request.nextUrl.pathname;
  const isAdminPath = pathname.startsWith('/admin');
  const isLoginPath = pathname === '/admin/login';

  // --- 3. ADMIN AUTHENTICATION LOGIC ---
  // We only run these checks if the user is attempting to access an admin route
  if (isAdminPath) {
    const authToken = request.cookies.get('admin_session')?.value;

    // LOGIC A: If trying to access Admin but NOT logged in -> Overwrite response to Redirect to Login
    if (!isLoginPath && !authToken) {
      const loginUrl = new URL('/admin/login', request.url);
      response = NextResponse.redirect(loginUrl);
    } 
    // LOGIC B: If already logged in but trying to access Login -> Overwrite response to Redirect to Dashboard
    else if (isLoginPath && authToken) {
      const dashboardUrl = new URL('/admin', request.url);
      response = NextResponse.redirect(dashboardUrl);
    }
  }

  // --- 4. GUEST SESSION LOGIC ---
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

  // 5. Return the single, final response to Next.js
  return response;
}

// Configuration: Run on all paths EXCEPT Next.js internals and static assets
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};