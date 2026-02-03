// middleware.js
import { NextResponse } from 'next/server';
import { adminMiddleware } from './middleware/admin';

export async function middleware(request) {
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