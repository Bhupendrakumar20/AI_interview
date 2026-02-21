// app/api/auth/admin-verify/route.js
import { auth } from '@/firebase/admin';

// ✅ Explicitly use Node.js runtime (required for Firebase Admin SDK)
export const runtime = 'nodejs';

export async function POST(request) {
  try {
    const { idToken } = await request.json();

    if (!idToken) {
      return new Response(JSON.stringify({ error: 'No token provided' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Verify token
    const decodedToken = await auth.verifyIdToken(idToken);

    // Check if user has admin claims
    const isAdmin = decodedToken.admin === true || decodedToken.super_admin === true;

    return new Response(
      JSON.stringify({
        isAdmin,
        userId: decodedToken.uid,
        email: decodedToken.email,
        role: decodedToken.role || 'user',
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Admin verification error:', error);
    return new Response(
      JSON.stringify({
        error: 'Token verification failed',
        isAdmin: false,
      }),
      {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
