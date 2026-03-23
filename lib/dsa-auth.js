'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth, db } from '@/firebase/client';
import { doc, setDoc, getDoc } from 'firebase/firestore';

// Sign Up
export async function signUpUser(email, password, username) {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Create user profile in Firestore
    await setDoc(doc(db, 'users', user.uid), {
      email,
      username,
      avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`,
      skillLevel: 'beginner',
      created_at: new Date(),
      updated_at: new Date(),
      last_login: new Date(),
    });

    // Create stats document
    await setDoc(doc(db, 'user_stats', user.uid), {
      user_id: user.uid,
      total_rooms: 0,
      total_wins: 0,
      total_solved: 0,
      avg_points: 0,
      current_streak: 0,
      best_streak: 0,
      first_bloods: 0,
      updated_at: new Date(),
    });

    return { success: true, user };
  } catch (error) {
    console.error('Signup error:', error);
    throw new Error(error.message);
  }
}

// Sign In
export async function signInUser(email, password) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Update last login
    await setDoc(
      doc(db, 'users', user.uid),
      { last_login: new Date() },
      { merge: true }
    );

    return { success: true, user };
  } catch (error) {
    console.error('Login error:', error);
    throw new Error(error.message);
  }
}

// Get User Profile
export async function getUserProfile(uid) {
  try {
    const userDoc = await getDoc(doc(db, 'users', uid));
    return userDoc.exists() ? userDoc.data() : null;
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return null;
  }
}

// Get User Stats
export async function getUserStats(uid) {
  try {
    const statsDoc = await getDoc(doc(db, 'user_stats', uid));
    return statsDoc.exists() ? statsDoc.data() : null;
  } catch (error) {
    console.error('Error fetching user stats:', error);
    return null;
  }
}

// Update User Profile
export async function updateUserProfile(uid, updates) {
  try {
    await setDoc(doc(db, 'users', uid), updates, { merge: true });
    return { success: true };
  } catch (error) {
    console.error('Error updating profile:', error);
    throw new Error(error.message);
  }
}

// Sign Out
export async function signOutUser() {
  try {
    await signOut(auth);
    return { success: true };
  } catch (error) {
    console.error('Logout error:', error);
    throw new Error(error.message);
  }
}

// Custom Hook for Auth
export function useAuth() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useState(() => {
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        const profile = await getUserProfile(currentUser.uid);
        const stats = await getUserStats(currentUser.uid);
        setProfile(profile);
        setStats(stats);
      } else {
        setUser(null);
        setProfile(null);
        setStats(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  return { user, profile, stats, loading };
}
