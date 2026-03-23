'use client';

import { db } from '@/firebase/client';
import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  writeBatch,
  Timestamp,
} from 'firebase/firestore';

// ─────────────────────────────────────────────────────────────────────────────
// USER OPERATIONS
// ─────────────────────────────────────────────────────────────────────────────

export async function createUserProfile(uid, email, username) {
  try {
    const now = Timestamp.now();
    await setDoc(doc(db, 'users', uid), {
      email,
      username,
      avatar_url: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`,
      bio: '',
      skillLevel: 'beginner',
      created_at: now,
      updated_at: now,
      last_login: now,
    });

    // Create stats document
    await setDoc(doc(db, 'user_stats', uid), {
      user_id: uid,
      total_rooms: 0,
      total_wins: 0,
      total_solved: 0,
      avg_points: 0,
      current_streak: 0,
      best_streak: 0,
      first_bloods: 0,
      favorite_language: null,
      favorite_difficulty: null,
      updated_at: now,
    });

    return { success: true };
  } catch (error) {
    console.error('Error creating user profile:', error);
    throw error;
  }
}

export async function getUserProfile(uid) {
  try {
    const userDoc = await getDoc(doc(db, 'users', uid));
    return userDoc.exists() ? userDoc.data() : null;
  } catch (error) {
    console.error('Error getting user profile:', error);
    return null;
  }
}

export async function getUserStats(uid) {
  try {
    const statsDoc = await getDoc(doc(db, 'user_stats', uid));
    return statsDoc.exists() ? statsDoc.data() : null;
  } catch (error) {
    console.error('Error getting user stats:', error);
    return null;
  }
}

export async function updateUserProfile(uid, updates) {
  try {
    await updateDoc(doc(db, 'users', uid), {
      ...updates,
      updated_at: Timestamp.now(),
    });
    return { success: true };
  } catch (error) {
    console.error('Error updating user profile:', error);
    throw error;
  }
}

export async function updateUserStats(uid, stats) {
  try {
    await updateDoc(doc(db, 'user_stats', uid), {
      ...stats,
      updated_at: Timestamp.now(),
    });
    return { success: true };
  } catch (error) {
    console.error('Error updating user stats:', error);
    throw error;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// QUESTION OPERATIONS
// ─────────────────────────────────────────────────────────────────────────────

export async function createQuestion(questionData) {
  try {
    const now = Timestamp.now();
    const docRef = doc(collection(db, 'dsa_questions'));
    
    await setDoc(docRef, {
      ...questionData,
      created_at: now,
      is_active: true,
    });

    return { id: docRef.id, success: true };
  } catch (error) {
    console.error('Error creating question:', error);
    throw error;
  }
}

export async function getQuestion(questionId) {
  try {
    const qDoc = await getDoc(doc(db, 'dsa_questions', questionId));
    return qDoc.exists() ? qDoc.data() : null;
  } catch (error) {
    console.error('Error getting question:', error);
    return null;
  }
}

export async function getRandomQuestion(difficulty = null) {
  try {
    let q = query(
      collection(db, 'dsa_questions'),
      where('is_active', '==', true),
      orderBy('created_at', 'desc'),
      limit(50)
    );

    if (difficulty) {
      q = query(
        collection(db, 'dsa_questions'),
        where('difficulty', '==', difficulty),
        where('is_active', '==', true),
        orderBy('created_at', 'desc'),
        limit(50)
      );
    }

    const snapshot = await getDocs(q);
    const questions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    // Return random question from results
    return questions.length > 0 ? questions[Math.floor(Math.random() * questions.length)] : null;
  } catch (error) {
    console.error('Error getting random question:', error);
    return null;
  }
}

export async function getQuestionsByDifficulty(difficulty, pageSize = 10) {
  try {
    const q = query(
      collection(db, 'dsa_questions'),
      where('difficulty', '==', difficulty),
      where('is_active', '==', true),
      orderBy('created_at', 'desc'),
      limit(pageSize)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error getting questions:', error);
    return [];
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ROOM OPERATIONS
// ─────────────────────────────────────────────────────────────────────────────

export async function createRoom(hostId, roomCode, questionId) {
  try {
    const now = Timestamp.now();
    const docRef = doc(collection(db, 'dsa_rooms'));

    await setDoc(docRef, {
      room_code: roomCode,
      host_id: hostId,
      question_id: questionId,
      status: 'lobby',
      max_players: 10,
      created_at: now,
      started_at: null,
      ended_at: null,
      config: {
        questionMode: 'same',
        timeLimit: 1800, // 30 minutes in seconds
        difficulty: 'medium',
      },
      participants: [hostId],
    });

    return { id: docRef.id, success: true };
  } catch (error) {
    console.error('Error creating room:', error);
    throw error;
  }
}

export async function getRoomByCode(roomCode) {
  try {
    const q = query(
      collection(db, 'dsa_rooms'),
      where('room_code', '==', roomCode)
    );

    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;

    const room = snapshot.docs[0];
    return { id: room.id, ...room.data() };
  } catch (error) {
    console.error('Error getting room by code:', error);
    return null;
  }
}

export async function getRoom(roomId) {
  try {
    const roomDoc = await getDoc(doc(db, 'dsa_rooms', roomId));
    return roomDoc.exists() ? { id: roomDoc.id, ...roomDoc.data() } : null;
  } catch (error) {
    console.error('Error getting room:', error);
    return null;
  }
}

export async function updateRoom(roomId, updates) {
  try {
    await updateDoc(doc(db, 'dsa_rooms', roomId), updates);
    return { success: true };
  } catch (error) {
    console.error('Error updating room:', error);
    throw error;
  }
}

export async function addRoomParticipant(roomId, userId) {
  try {
    const roomDoc = await getDoc(doc(db, 'dsa_rooms', roomId));
    const participants = roomDoc.data().participants || [];
    
    if (!participants.includes(userId)) {
      participants.push(userId);
      await updateDoc(doc(db, 'dsa_rooms', roomId), { participants });
    }

    return { success: true };
  } catch (error) {
    console.error('Error adding participant:', error);
    throw error;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ROOM USER OPERATIONS
// ─────────────────────────────────────────────────────────────────────────────

export async function addUserToRoom(roomId, userId, role = 'member') {
  try {
    const docId = `${roomId}__${userId}`;
    await setDoc(doc(db, 'room_users', docId), {
      room_id: roomId,
      user_id: userId,
      role,
      points: 0,
      solved_at: null,
      language: 'javascript',
      status: 'coding',
      joined_at: Timestamp.now(),
    });

    // Add to room participants array
    await addRoomParticipant(roomId, userId);

    return { success: true };
  } catch (error) {
    console.error('Error adding user to room:', error);
    throw error;
  }
}

export async function getRoomLeaderboard(roomId) {
  try {
    const q = query(
      collection(db, 'room_users'),
      where('room_id', '==', roomId),
      orderBy('points', 'desc'),
      orderBy('solved_at', 'asc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc, index) => ({
      rank: index + 1,
      ...doc.data(),
    }));
  } catch (error) {
    console.error('Error getting leaderboard:', error);
    return [];
  }
}

export async function updateRoomUser(roomId, userId, updates) {
  try {
    const docId = `${roomId}__${userId}`;
    await updateDoc(doc(db, 'room_users', docId), updates);
    return { success: true };
  } catch (error) {
    console.error('Error updating room user:', error);
    throw error;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SUBMISSION OPERATIONS
// ─────────────────────────────────────────────────────────────────────────────

export async function createSubmission(submissionData) {
  try {
    const docRef = doc(collection(db, 'submissions'));
    
    await setDoc(docRef, {
      ...submissionData,
      submitted_at: Timestamp.now(),
      completed_at: null,
    });

    return { id: docRef.id, success: true };
  } catch (error) {
    console.error('Error creating submission:', error);
    throw error;
  }
}

export async function getSubmission(submissionId) {
  try {
    const subDoc = await getDoc(doc(db, 'submissions', submissionId));
    return subDoc.exists() ? subDoc.data() : null;
  } catch (error) {
    console.error('Error getting submission:', error);
    return null;
  }
}

export async function getRoomSubmissions(roomId) {
  try {
    const q = query(
      collection(db, 'submissions'),
      where('room_id', '==', roomId),
      orderBy('submitted_at', 'desc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error getting room submissions:', error);
    return [];
  }
}

export async function updateSubmission(submissionId, updates) {
  try {
    await updateDoc(doc(db, 'submissions', submissionId), {
      ...updates,
      completed_at: Timestamp.now(),
    });
    return { success: true };
  } catch (error) {
    console.error('Error updating submission:', error);
    throw error;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// VOTE OPERATIONS
// ─────────────────────────────────────────────────────────────────────────────

export async function castVote(roomId, userId, voteType, voteValue) {
  try {
    const docId = `${roomId}__${userId}__${voteType}`;
    
    await setDoc(doc(db, 'room_votes', docId), {
      room_id: roomId,
      user_id: userId,
      vote_type: voteType,
      vote_value: voteValue,
      voted_at: Timestamp.now(),
    });

    return { success: true };
  } catch (error) {
    console.error('Error casting vote:', error);
    throw error;
  }
}

export async function getRoomVotes(roomId, voteType) {
  try {
    const q = query(
      collection(db, 'room_votes'),
      where('room_id', '==', roomId),
      where('vote_type', '==', voteType)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data());
  } catch (error) {
    console.error('Error getting votes:', error);
    return [];
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ACHIEVEMENT OPERATIONS
// ─────────────────────────────────────────────────────────────────────────────

export async function awardAchievement(userId, badgeName, roomId = null) {
  try {
    const docRef = doc(collection(db, 'user_achievements'));
    
    await setDoc(docRef, {
      user_id: userId,
      badge_name: badgeName,
      earned_at: Timestamp.now(),
      room_id: roomId,
    });

    return { success: true };
  } catch (error) {
    console.error('Error awarding achievement:', error);
    throw error;
  }
}

export async function getUserAchievements(userId) {
  try {
    const q = query(
      collection(db, 'user_achievements'),
      where('user_id', '==', userId),
      orderBy('earned_at', 'desc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data());
  } catch (error) {
    console.error('Error getting achievements:', error);
    return [];
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// LEADERBOARD & RANKINGS
// ─────────────────────────────────────────────────────────────────────────────

export async function getGlobalRankings(pageSize = 100) {
  try {
    const q = query(
      collection(db, 'user_stats'),
      where('total_rooms', '>', 0),
      orderBy('total_wins', 'desc'),
      limit(pageSize)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc, index) => ({
      rank: index + 1,
      userId: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error('Error getting global rankings:', error);
    return [];
  }
}

export async function getUserRank(userId) {
  try {
    const allStats = await getGlobalRankings(1000);
    const rank = allStats.findIndex(s => s.userId === userId) + 1;
    return rank || null;
  } catch (error) {
    console.error('Error getting user rank:', error);
    return null;
  }
}

export async function getUserRooms(userId, pageSize = 10) {
  try {
    const q = query(
      collection(db, 'dsa_rooms'),
      where('participants', 'array-contains', userId),
      orderBy('created_at', 'desc'),
      limit(pageSize)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error getting user rooms:', error);
    return [];
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// BATCH OPERATIONS
// ─────────────────────────────────────────────────────────────────────────────

export async function batchUpdateLeaderboard(roomId, updates) {
  try {
    const batch = writeBatch(db);

    for (const [userId, data] of Object.entries(updates)) {
      const docId = `${roomId}__${userId}`;
      batch.update(doc(db, 'room_users', docId), data);
    }

    await batch.commit();
    return { success: true };
  } catch (error) {
    console.error('Error batch updating leaderboard:', error);
    throw error;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// CLEANUP OPERATIONS
// ─────────────────────────────────────────────────────────────────────────────

export async function deleteRoom(roomId) {
  try {
    // Delete room
    await deleteDoc(doc(db, 'dsa_rooms', roomId));

    // Delete room_users
    const ruQuery = query(
      collection(db, 'room_users'),
      where('room_id', '==', roomId)
    );
    const ruSnapshot = await getDocs(ruQuery);
    const batch = writeBatch(db);
    ruSnapshot.forEach(doc => batch.delete(doc.ref));
    await batch.commit();

    return { success: true };
  } catch (error) {
    console.error('Error deleting room:', error);
    throw error;
  }
}
