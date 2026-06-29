// proxy.js — Next.js Route Proxy
// Protects /admin routes with authentication
import { NextResponse } from 'next/server';
import { adminMiddleware } from './middleware/admin';

export async function proxy(request) {
  const path = request.nextUrl.pathname;
  
  // Protect admin routes
  if (path.startsWith('/admin')) {
    return adminMiddleware(request);
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/admin/:path*',
  ],
};
