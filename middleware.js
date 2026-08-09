// proxy.js — Next.js Route Proxy
// Protects /admin routes with authentication
import { NextResponse } from 'next/server';
import { adminMiddleware } from './middleware/admin';

export async function middleware(request) {
  const path = request.nextUrl.pathname;
  
  // Protect admin routes
  if (path.startsWith('/admin')) {
    const adminRes = await adminMiddleware(request);
    if (adminRes) return adminRes;
  }
  
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", path);

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
