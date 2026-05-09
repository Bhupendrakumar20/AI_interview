/**
 * Voting System Protection
 * Prevents duplicate votes, validates vote types, uses transactions
 */

import * as admin from "firebase-admin";
import { db } from "@/firebase/admin";

// In-memory voting tracking for socket rooms
// Format: { roomId: { userId: { voteType: true } } }
const voteTracker = new Map();

/**
 * Check if a user has already voted in a room for a vote type
 */
export function hasUserVoted(roomId, userId, voteType) {
  if (!voteTracker.has(roomId)) {
    return false;
  }

  const roomVotes = voteTracker.get(roomId);
  return roomVotes[userId]?.[voteType] || false;
}

/**
 * Record a vote in memory (for socket-based voting)
 */
export function recordVote(roomId, userId, voteType) {
  if (!voteTracker.has(roomId)) {
    voteTracker.set(roomId, {});
  }

  const roomVotes = voteTracker.get(roomId);
  if (!roomVotes[userId]) {
    roomVotes[userId] = {};
  }

  roomVotes[userId][voteType] = true;
}

/**
 * Clear votes for a room (when room is closed)
 */
export function clearRoomVotes(roomId) {
  voteTracker.delete(roomId);
}

/**
 * Clear a user's votes when they leave
 */
export function clearUserVotes(roomId, userId) {
  if (voteTracker.has(roomId)) {
    const roomVotes = voteTracker.get(roomId);
    delete roomVotes[userId];
  }
}

/**
 * Validate vote value based on type
 */
export function isValidVote(voteType, vote) {
  const validVotes = {
    time_limit: ["5", "10", "15", "20", "30", "45", "60"],
    question_mode: ["same", "different"],
    difficulty: ["easy", "medium", "hard"],
  };

  if (!validVotes[voteType]) {
    return false;
  }

  return validVotes[voteType].includes(String(vote));
}

/**
 * Process vote with transaction (for persistent storage)
 */
export async function recordVoteWithTransaction(roomId, userId, voteType, vote) {
  try {
    const result = await db.runTransaction(async (transaction) => {
      // Validate vote
      if (!isValidVote(voteType, vote)) {
        throw new Error(`Invalid ${voteType} vote: ${vote}`);
      }

      // Create vote document
      const voteId = `${roomId}:${userId}:${voteType}`;
      const voteRef = db.collection("dsa_votes").doc(voteId);
      const voteDoc = await transaction.get(voteRef);

      // Check for duplicate vote in database
      if (voteDoc.exists) {
        throw new Error(`You have already voted for ${voteType}`);
      }

      // Get room data
      const roomRef = db.collection("dsa_rooms").doc(roomId);
      const roomDoc = await transaction.get(roomRef);

      if (!roomDoc.exists) {
        throw new Error("Room not found");
      }

      const roomData = roomDoc.data();

      // Validate voting is active
      const votingPhases = {
        time_limit: ["setup"],
        question_mode: ["setup"],
        difficulty: ["in_progress"],
      };

      if (!votingPhases[voteType]?.includes(roomData.phase)) {
        throw new Error(`Cannot vote for ${voteType} in current phase`);
      }

      // Record the vote
      transaction.set(voteRef, {
        roomId,
        userId,
        voteType,
        vote,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Update room vote counts
      const voteCountField = `${voteType}_votes`;
      const currentVotes = roomData[voteCountField] || {};
      const updatedVotes = { ...currentVotes };
      updatedVotes[vote] = (updatedVotes[vote] || 0) + 1;

      transaction.update(roomRef, {
        [voteCountField]: updatedVotes,
        totalVoted: (roomData.totalVoted || 0) + 1,
      });

      return { success: true, vote };
    });

    return result;
  } catch (error) {
    throw new Error(`Vote failed: ${error.message}`);
  }
}

/**
 * Get vote summary for a room
 */
export async function getVoteSummary(roomId, voteType) {
  try {
    const query = db
      .collection("dsa_votes")
      .where("roomId", "==", roomId)
      .where("voteType", "==", voteType);

    const snapshot = await query.get();
    const votes = {};
    let totalVotes = 0;

    snapshot.forEach((doc) => {
      const { vote } = doc.data();
      votes[vote] = (votes[vote] || 0) + 1;
      totalVotes += 1;
    });

    return {
      voteType,
      votes,
      totalVotes,
      winnervote: Object.keys(votes).reduce((a, b) => (votes[a] > votes[b] ? a : b), null),
    };
  } catch (error) {
    throw new Error(`Failed to get vote summary: ${error.message}`);
  }
}

/**
 * Finalize votes for a room (close voting)
 */
export async function finalizeVotes(roomId) {
  try {
    // Get all votes for this room
    const query = db.collection("dsa_votes").where("roomId", "==", roomId);
    const snapshot = await query.get();

    const summary = {};

    snapshot.forEach((doc) => {
      const { voteType, vote } = doc.data();

      if (!summary[voteType]) {
        summary[voteType] = {};
      }

      summary[voteType][vote] = (summary[voteType][vote] || 0) + 1;
    });

    // Update room with final vote results
    const roomRef = db.collection("dsa_rooms").doc(roomId);
    await roomRef.update({
      votingResults: summary,
      votingClosed: true,
      votingClosedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Clear in-memory votes
    clearRoomVotes(roomId);

    return summary;
  } catch (error) {
    throw new Error(`Failed to finalize votes: ${error.message}`);
  }
}

/**
 * Get user's votes in a room
 */
export async function getUserVotes(roomId, userId) {
  try {
    const query = db
      .collection("dsa_votes")
      .where("roomId", "==", roomId)
      .where("userId", "==", userId);

    const snapshot = await query.get();
    const userVotes = {};

    snapshot.forEach((doc) => {
      const { voteType, vote } = doc.data();
      userVotes[voteType] = vote;
    });

    return userVotes;
  } catch (error) {
    throw new Error(`Failed to get user votes: ${error.message}`);
  }
}
