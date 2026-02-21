// middleware/admin.js
import { NextResponse } from 'next/server';

export async function adminMiddleware(request) {
  try {
    // Get session cookie
    const sessionCookie = request.cookies.get('session')?.value;
    
    // Check for login path - allow access to login page
    const pathname = request.nextUrl.pathname;
    if (pathname === '/admin/login' || pathname === '/admin/login/') {
      return NextResponse.next();
    }
    
    // If no session, redirect to login
    if (!sessionCookie) {
      return NextResponse.redirect(new URL('/admin/login?redirect=' + pathname, request.url));
    }
    
    // Session exists, allow to proceed
    // Admin verification will happen in the page component via API call
    return NextResponse.next();
  } catch (error) {
    console.error('Admin middleware error:', error);
    
    // Redirect to login on any error
    const response = NextResponse.redirect(new URL('/admin/login', request.url));
    response.cookies.delete('session');
    
    return response;
  }
}