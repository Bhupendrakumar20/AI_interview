// app/api/auth/admin-verify/route.js
import { auth } from "@/firebase/admin";
import { cookies } from "next/headers";

export async function POST(request) {
  try {
    const { idToken } = await request.json();
    
    // Verify ID token
    const decodedToken = await auth.verifyIdToken(idToken);
    const customClaims = decodedToken.customClaims || {};
    
    // Check if user is admin
    const isAdmin = customClaims.admin || customClaims.super_admin;
    
    if (!isAdmin) {
      return Response.json({ isAdmin: false, error: "Admin privileges required" }, { status: 403 });
    }
    
    // Create session cookie for admin
    const sessionCookie = await auth.createSessionCookie(idToken, {
      expiresIn: 60 * 60 * 24 * 7 * 1000, // 1 week
    });
    
    const cookieStore = await cookies();
    cookieStore.set('session', sessionCookie, {
      maxAge: 60 * 60 * 24 * 7, // 1 week
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      sameSite: 'lax',
    });
    
    return Response.json({ 
      isAdmin: true,
      user: {
        uid: decodedToken.uid,
        email: decodedToken.email,
        name: decodedToken.name,
        role: customClaims.role,
        permissions: customClaims.permissions
      }
    });
    
  } catch (error) {
    console.error("Admin verification error:", error);
    return Response.json({ isAdmin: false, error: error.message }, { status: 500 });
  }
}