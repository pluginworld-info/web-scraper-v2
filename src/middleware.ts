import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // 1. Define the protected path
  const isAdminPath = request.nextUrl.pathname.startsWith('/admin');
  const isLoginPath = request.nextUrl.pathname === '/admin/login';

  // 2. Check if the user has the secure cookie
  const authToken = request.cookies.get('admin_session')?.value;

  // 3. LOGIC: If trying to access Admin but NOT logged in -> Redirect to Login
  if (isAdminPath && !isLoginPath && !authToken) {
    const loginUrl = new URL('/admin/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  // 4. LOGIC: If already logged in but trying to access Login -> Redirect to Dashboard
  if (isLoginPath && authToken) {
    const dashboardUrl = new URL('/admin', request.url);
    return NextResponse.redirect(dashboardUrl);
  }

  return NextResponse.next();
}

// Configuration: Only run this middleware on admin routes
export const config = {
  matcher: '/admin/:path*',
};