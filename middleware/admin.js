// middleware/admin.js
import { NextResponse } from 'next/server';
import { auth } from '@/firebase/admin';

export async function adminMiddleware(request) {
  try {
    // Get token from cookies
    const sessionCookie = request.cookies.get('session')?.value;
    
    if (!sessionCookie) {
      return NextResponse.redirect(new URL('/sign-in?redirect=' + request.nextUrl.pathname, request.url));
    }
    
    // Verify session cookie
    const decodedClaims = await auth.verifySessionCookie(sessionCookie, true);
    
    // Check admin claims
    const customClaims = decodedClaims.customClaims || {};
    
    if (!customClaims.admin && !customClaims.super_admin) {
      return NextResponse.redirect(new URL('/', request.url));
    }
    
    // Add admin info to headers
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set('x-user-id', decodedClaims.uid);
    requestHeaders.set('x-user-role', customClaims.role || 'user');
    requestHeaders.set('x-is-admin', 'true');
    
    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  } catch (error) {
    console.error('Admin middleware error:', error);
    
    // Clear invalid session
    const response = NextResponse.redirect(new URL('/sign-in', request.url));
    response.cookies.delete('session');
    
    return response;
  }
}