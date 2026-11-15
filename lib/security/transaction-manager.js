/**
 * Transaction Manager for Firestore
 * Prevents race conditions and data corruption
 * Ensures atomic operations across multiple documents
 */

import * as admin from "firebase-admin";
import { db } from "@/firebase/admin";

/**
 * Update session with transaction to prevent race conditions
 * Ensures atomicity: Either all updates succeed or none
 */
export async function updateSessionWithTransaction(sessionId, updateData, currentUser) {
  try {
    const userSessionRef = db
      .collection("users")
      .doc(currentUser.uid)
      .collection("interview_buddy_sessions")
      .doc(sessionId);
    const sharedSessionRef = db.collection("interview_buddy_sessions").doc(sessionId);

    const result = await db.runTransaction(async (transaction) => {
      const userSessionDoc = await transaction.get(userSessionRef);
      const sharedSessionDoc = userSessionDoc.exists
        ? null
        : await transaction.get(sharedSessionRef);
      const sessionRef = userSessionDoc.exists ? userSessionRef : sharedSessionRef;
      const sessionDoc = userSessionDoc.exists ? userSessionDoc : sharedSessionDoc;

      if (!sessionDoc?.exists) {
        throw new Error("Session not found");
      }

      const sessionData = sessionDoc.data();

      // Verify ownership within transaction
      if (sessionData.createdBy !== currentUser.uid) {
        throw new Error("Unauthorized: User does not own this session");
      }

      // Validate state transitions within transaction
      const currentStatus = sessionData.status;
      const newStatus = updateData.status;

      if (currentStatus === "completed" && (newStatus === "in-progress" || newStatus === "created")) {
        throw new Error("Cannot restart a completed session");
      }

      // If score is being updated, increment stats atomically
      if (updateData.score !== undefined && updateData.score !== null) {
        const statsRef = db.collection("users").doc(currentUser.uid).collection("user_stats").doc("buddy");
        const statsDoc = await transaction.get(statsRef);
        const scoreNum = typeof updateData.score === "number" ? updateData.score : Number(updateData.score) || 0;

        if (statsDoc.exists) {
          const stats = statsDoc.data();
          const prevTotal = stats.totalSessions || 0;
          const prevAvg = stats.averageScore || 0;
          const newTotal = prevTotal + 1;
          const newAvg = Math.round((prevAvg * prevTotal + scoreNum) / newTotal);
          transaction.update(statsRef, {
            totalSessions: newTotal,
            averageScore: newAvg,
            highestScore: Math.max(stats.highestScore || 0, scoreNum),
            lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
          });
        } else {
          transaction.set(statsRef, {
            userId: currentUser.uid,
            totalSessions: 1,
            averageScore: scoreNum,
            highestScore: scoreNum,
            lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
          });
        }

        // Also update user profile document in Firestore
        const userProfileRef = db.collection("users").doc(currentUser.uid);
        transaction.set(
          userProfileRef,
          {
            interviewBuddyStats: {
              lastScore: scoreNum,
              lastSessionId: sessionId,
              lastSessionDate: admin.firestore.FieldValue.serverTimestamp(),
            },
          },
          { merge: true }
        );
      }

      const finalUpdatedData = {
        ...sessionData,
        ...updateData,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedBy: currentUser.uid,
      };

      // Save to BOTH shared collection and user profile subcollection so it's always stored in user profile in Firebase!
      transaction.set(sharedSessionRef, finalUpdatedData, { merge: true });
      transaction.set(userSessionRef, finalUpdatedData, { merge: true });

      return finalUpdatedData;
    });

    return result;
  } catch (error) {
    throw new Error(`Transaction failed: ${error.message}`);
  }
}

/**
 * Record vote with transaction to prevent duplicate votes
 * Ensures each user can vote only once per session
 */
export async function recordVoteWithTransaction(sessionId, votedUserId, voteType, currentUser) {
  try {
    const query = await db.collectionGroup("interview_buddy_sessions")
      .where(admin.firestore.FieldPath.documentId(), "==", sessionId)
      .limit(1)
      .get();
    if (query.empty) {
      throw new Error("Session not found");
    }
    const sessionRef = query.docs[0].ref;

    const result = await db.runTransaction(async (transaction) => {
      const voteId = `${sessionId}:${currentUser.uid}:${votedUserId}`;
      const voteRef = sessionRef.collection("session_votes").doc(voteId);
      const voteDoc = await transaction.get(voteRef);

      // Check if user already voted
      if (voteDoc.exists) {
        throw new Error("You have already voted for this user in this session");
      }

      const sessionDoc = await transaction.get(sessionRef);

      if (!sessionDoc.exists) {
        throw new Error("Session not found");
      }

      if (sessionDoc.data().status !== "completed") {
        throw new Error("Can only vote after session is completed");
      }

      // Record the vote
      transaction.set(voteRef, {
        sessionId,
        votedUserId,
        voterId: currentUser.uid,
        voteType, // 'upvote', 'downvote', 'helpful', etc.
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Update vote count for votedUserId
      const userStatsRef = db.collection("users").doc(votedUserId).collection("user_stats").doc("dsa");
      const userStatsDoc = await transaction.get(userStatsRef);

      if (userStatsDoc.exists) {
        const stats = userStatsDoc.data();
        transaction.update(userStatsRef, {
          [voteType]: (stats[voteType] || 0) + 1,
          totalVotes: (stats.totalVotes || 0) + 1,
          lastVotedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      } else {
        transaction.set(userStatsRef, {
          userId: votedUserId,
          [voteType]: 1,
          totalVotes: 1,
          lastVotedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }

      return { success: true, voteId };
    });

    return result;
  } catch (error) {
    throw new Error(`Vote transaction failed: ${error.message}`);
  }
}

/**
 * Create DSA room and add creator as participant with transaction
 * Ensures room and participant records are created atomically
 */
export async function createDSARoomWithTransaction(roomData, currentUser) {
  try {
    const result = await db.runTransaction(async (transaction) => {
      const roomRef = db.collection("dsa_rooms").doc();
      const participantRef = roomRef.collection("participants").doc(currentUser.uid);

      // Create room
      transaction.set(roomRef, {
        ...roomData,
        createdBy: currentUser.uid,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        currentParticipants: 1,
        status: "created",
      });

      // Add creator as participant (transaction update to room count)
      transaction.set(participantRef, {
        userId: currentUser.uid,
        username: currentUser.email?.split("@")[0] || "User",
        joinedAt: admin.firestore.FieldValue.serverTimestamp(),
        role: "creator",
      });

      return { roomId: roomRef.id, success: true };
    });

    return result;
  } catch (error) {
    throw new Error(`DSA room creation failed: ${error.message}`);
  }
}

/**
 * Join DSA room with participant count validation
 * Prevents exceeding maxParticipants
 */
export async function joinDSARoomWithTransaction(roomId, currentUser, maxParticipants) {
  try {
    const result = await db.runTransaction(async (transaction) => {
      const roomRef = db.collection("dsa_rooms").doc(roomId);
      const roomDoc = await transaction.get(roomRef);

      if (!roomDoc.exists) {
        throw new Error("Room not found");
      }

      const room = roomDoc.data();

      // Check if room is full
      if (room.currentParticipants >= maxParticipants) {
        throw new Error("Room is full");
      }

      // Check if already joined
      const participantRef = roomRef.collection("participants").doc(currentUser.uid);
      const participantDoc = await transaction.get(participantRef);

      if (participantDoc.exists) {
        throw new Error("Already joined this room");
      }

      // Add participant
      transaction.set(participantRef, {
        userId: currentUser.uid,
        username: currentUser.email?.split("@")[0] || "User",
        joinedAt: admin.firestore.FieldValue.serverTimestamp(),
        role: "participant",
      });

      // Update room participant count
      transaction.update(roomRef, {
        currentParticipants: room.currentParticipants + 1,
      });

      return { success: true, roomId };
    });

    return result;
  } catch (error) {
    throw new Error(`Join room failed: ${error.message}`);
  }
}

/**
 * Leave DSA room and decrement participant count
 * Atomic operation to prevent data inconsistency
 */
export async function leaveDSARoomWithTransaction(roomId, userId) {
  try {
    const result = await db.runTransaction(async (transaction) => {
      const roomRef = db.collection("dsa_rooms").doc(roomId);
      const roomDoc = await transaction.get(roomRef);

      if (!roomDoc.exists) {
        throw new Error("Room not found");
      }

      const room = roomDoc.data();

      // Remove participant
      const participantRef = roomRef.collection("participants").doc(userId);
      transaction.delete(participantRef);

      // Update room count
      transaction.update(roomRef, {
        currentParticipants: Math.max(0, room.currentParticipants - 1),
      });

      return { success: true, roomId };
    });

    return result;
  } catch (error) {
    throw new Error(`Leave room failed: ${error.message}`);
  }
}

/**
 * Update DSA score with validation and transaction
 * Prevents score manipulation and race conditions
 */
export async function updateDSAScoreWithTransaction(roomId, userId, score, problemsCompleted) {
  try {
    const result = await db.runTransaction(async (transaction) => {
      // Validate score range
      if (score < 0 || score > 100) {
        throw new Error("Score must be between 0 and 100");
      }

      if (problemsCompleted < 0 || problemsCompleted > 1000) {
        throw new Error("Problems completed must be between 0 and 1000");
      }

      const participantRef = db.collection("dsa_rooms").doc(roomId).collection("participants").doc(userId);
      const participantDoc = await transaction.get(participantRef);

      if (!participantDoc.exists) {
        throw new Error("Participant not found in room");
      }

      // Update participant score
      transaction.update(participantRef, {
        score,
        problemsCompleted,
        scoredAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Update user DSA stats
      const statsRef = db.collection("users").doc(userId).collection("user_stats").doc("dsa");
      const statsDoc = await transaction.get(statsRef);

      if (statsDoc.exists) {
        const stats = statsDoc.data();
        transaction.update(statsRef, {
          totalProblems: stats.totalProblems + problemsCompleted,
          averageScore: (stats.averageScore * stats.sessionCount + score) / (stats.sessionCount + 1),
          highestScore: Math.max(stats.highestScore || 0, score),
          sessionCount: stats.sessionCount + 1,
          lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
        });
      } else {
        transaction.set(statsRef, {
          userId,
          totalProblems: problemsCompleted,
          averageScore: score,
          highestScore: score,
          sessionCount: 1,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }

      return { success: true, score, problemsCompleted };
    });

    return result;
  } catch (error) {
    throw new Error(`Score update failed: ${error.message}`);
  }
}
