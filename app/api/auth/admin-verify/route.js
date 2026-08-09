// app/api/auth/admin-verify/route.js
import { verifyToken } from '@/lib/security/auth-utils';

// ✅ Explicitly use Node.js runtime
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
    const decodedToken = verifyToken(idToken);

    if (!decodedToken) {
      return new Response(JSON.stringify({ error: 'Invalid or expired token', isAdmin: false }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Check if user has admin claims
    const isAdmin = decodedToken.admin === true || decodedToken.role === 'admin' || decodedToken.role === 'super_admin';

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
