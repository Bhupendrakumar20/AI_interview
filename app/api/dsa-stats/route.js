import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { NextResponse } from 'next/server';

// Lazy initialize Firebase Admin
let db = null;

function getDb() {
  if (db) return db;
  
  const serviceAccount = JSON.parse(process.env.FIREBASE_ADMIN_KEY || '{}');
  
  if (!serviceAccount.project_id) {
    throw new Error('FIREBASE_ADMIN_KEY environment variable is not properly configured');
  }
  
  const apps = getApps();
  const app = apps.length > 0 ? apps[0] : initializeApp({ credential: cert(serviceAccount) });
  db = getFirestore(app);
  
  return db;
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const type = searchParams.get('type'); // 'user', 'global', 'rooms'

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    if (type === 'user') {
      // Get user profile & stats from Firestore
      const userDoc = await getDb().collection('users').doc(userId).get();
      const statsDoc = await getDb().collection('user_stats').doc(userId).get();

      return NextResponse.json({
        user: userDoc.exists() ? userDoc.data() : null,
        stats: statsDoc.exists() ? statsDoc.data() : null,
      });
    }

    if (type === 'global') {
      // Get global rankings from Firestore
      const snapshot = await getDb()
        .collection('user_stats')
        .where('total_rooms', '>', 0)
        .orderBy('total_wins', 'desc')
        .limit(100)
        .get();

      const rankings = snapshot.docs.map((doc, index) => ({
        rank: index + 1,
        userId: doc.id,
        ...doc.data(),
      }));

      return NextResponse.json({ rankings });
    }

    if (type === 'rooms') {
      // Get user's recent rooms from Firestore
      const snapshot = await getDb()
        .collection('dsa_rooms')
        .where('participants', 'array-contains', userId)
        .orderBy('created_at', 'desc')
        .limit(10)
        .get();

      const rooms = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      return NextResponse.json({ rooms });
    }

    return NextResponse.json({ error: 'Invalid type parameter' }, { status: 400 });
  } catch (error) {
    console.error('Stats API error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { action, userId, data } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
    }

    if (action === 'update_stats') {
      // Update user stats in Firestore
      const statsRef = getDb().collection('user_stats').doc(userId);
      await statsRef.update({
        total_rooms: data.total_rooms || 0,
        total_wins: data.total_wins || 0,
        total_solved: data.total_solved || 0,
        avg_points: data.avg_points || 0,
        updated_at: new Date(),
      });

      return NextResponse.json({ success: true, message: 'Stats updated' });
    }

    if (action === 'award_achievement') {
      // Award achievement/badge in Firestore
      const achievementRef = getDb().collection('user_achievements');
      await achievementRef.add({
        user_id: userId,
        badge_name: data.badge_name,
        earned_at: new Date(),
        room_id: data.room_id || null,
      });

      return NextResponse.json({ success: true, message: 'Achievement awarded' });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Stats update error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


