/**
 * DSA Score Validation System
 * Prevents score manipulation and validates submissions
 */

import * as admin from "firebase-admin";
import { db } from "@/firebase/admin";

/**
 * Valid point values for different achievements
 */
export const POINT_VALUES = {
  SUBMISSION_PASSED: 150,
  FIRST_BLOOD: 200,
  CORRECT_ANSWER: 100,
  ATTEMPT_PENALTY: -10,
  TIME_BONUS_MULTIPLIER: 1.5, // Extra 50% for solving within time limit
};

/**
 * Calculate score based on server-side submission data
 * Prevents client-side score manipulation
 */
export async function calculateDSAScore(roomId, userId) {
  try {
    // Get all submissions for this user in this room
    const submissions = await db
      .collection("dsa_room_submissions")
      .where("roomId", "==", roomId)
      .where("userId", "==", userId)
      .get();

    let totalPoints = 0;
    const submissionDetails = [];

    submissions.forEach((doc) => {
      const submission = doc.data();

      // Validate submission integrity
      if (!submission.status || !submission.questionId) {
        console.warn(`Invalid submission: ${doc.id}`);
        return;
      }

      // Only count accepted submissions
      if (submission.status === "accepted") {
        let points = POINT_VALUES.SUBMISSION_PASSED;

        // Apply time bonus if within time limit
        if (submission.timeFromStart && submission.timeFromStart < 3600000) {
          // 1 hour
          points = Math.floor(points * POINT_VALUES.TIME_BONUS_MULTIPLIER);
        }

        // First blood bonus (if this was first correct submission for the question)
        if (submission.isFirstBlood) {
          points += POINT_VALUES.FIRST_BLOOD;
        }

        totalPoints += points;

        submissionDetails.push({
          questionId: submission.questionId,
          points,
          submittedAt: submission.submittedAt,
          isFirstBlood: submission.isFirstBlood || false,
        });
      } else if (submission.status === "pending" || submission.status === "rejected") {
        // Penalize failed attempts
        totalPoints += POINT_VALUES.ATTEMPT_PENALTY;
      }
    });

    return {
      totalScore: Math.max(0, totalPoints), // Never negative
      submissionCount: submissions.size,
      acceptedCount: submissionDetails.length,
      details: submissionDetails,
    };
  } catch (error) {
    throw new Error(`Failed to calculate score: ${error.message}`);
  }
}

/**
 * Validate submitted score matches calculated score
 * Prevents score tampering
 */
export async function validateSubmittedScore(roomId, userId, submittedScore) {
  try {
    const calculated = await calculateDSAScore(roomId, userId);
    const tolerance = 5; // Allow 5 point difference due to rounding

    if (Math.abs(submittedScore - calculated.totalScore) > tolerance) {
      throw new Error(
        `Score mismatch: submitted ${submittedScore}, calculated ${calculated.totalScore}`
      );
    }

    return {
      valid: true,
      calculatedScore: calculated.totalScore,
      submittedScore,
      difference: submittedScore - calculated.totalScore,
    };
  } catch (error) {
    throw new Error(`Score validation failed: ${error.message}`);
  }
}

/**
 * Record DSA submission with comprehensive validation
 */
export async function recordDSASubmission(
  roomId,
  userId,
  questionId,
  code,
  language,
  timeFromStart,
  status = "pending"
) {
  try {
    // Validate inputs
    if (typeof timeFromStart !== "number" || timeFromStart < 0 || timeFromStart > 3600000) {
      throw new Error("Invalid timeFromStart value");
    }

    if (!["pending", "accepted", "rejected", "error"].includes(status)) {
      throw new Error("Invalid status value");
    }

    if (!code || code.length === 0 || code.length > 100000) {
      throw new Error("Invalid code length");
    }

    if (!["javascript", "python", "java", "cpp", "c"].includes(language.toLowerCase())) {
      throw new Error("Unsupported language");
    }

    // Check for duplicate recent submissions (prevent spam)
    const recentSubmissions = await db
      .collection("dsa_room_submissions")
      .where("roomId", "==", roomId)
      .where("userId", "==", userId)
      .where("questionId", "==", questionId)
      .get();

    if (!recentSubmissions.empty) {
      let lastSubmissionTime = 0;
      recentSubmissions.forEach((doc) => {
        const data = doc.data();
        const submittedTime = data.submittedAt 
          ? (data.submittedAt.toDate ? data.submittedAt.toDate().getTime() : new Date(data.submittedAt).getTime()) 
          : 0;
        if (submittedTime > lastSubmissionTime) {
          lastSubmissionTime = submittedTime;
        }
      });

      if (lastSubmissionTime > 0) {
        const timeSinceLastSubmission = Date.now() - lastSubmissionTime;
        if (timeSinceLastSubmission < 1000) {
          // Less than 1 second
          throw new Error("Too many submissions. Please wait before resubmitting.");
        }
      }
    }

    // Create submission record
    const submissionRef = await db.collection("dsa_room_submissions").add({
      roomId,
      userId,
      questionId,
      code,
      language: language.toLowerCase(),
      status,
      timeFromStart,
      codeHash: await hashCode(code), // For verification
      submittedAt: admin.firestore.FieldValue.serverTimestamp(),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    try {
      await db.collection("users").doc(userId).collection("dsa_submissions").add({
        submissionId: submissionRef.id,
        roomId,
        questionId,
        code,
        language: language.toLowerCase(),
        status,
        timeFromStart,
        submittedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      console.log("📝 Saved DSA submission record to user history subcollection.");
    } catch (saveErr) {
      console.error("Failed to save DSA submission to user history:", saveErr);
    }

    return {
      submissionId: submissionRef.id,
      status: "recorded",
      message: "Submission recorded successfully",
    };
  } catch (error) {
    throw new Error(`Failed to record submission: ${error.message}`);
  }
}

/**
 * Finalize DSA session with server-calculated scores
 * Uses transaction to ensure atomicity
 */
export async function finalizeDSASession(roomId, participants) {
  try {
    const result = await db.runTransaction(async (transaction) => {
      const finalScores = {};
      let maxScore = 0;

      // Calculate scores for all participants
      for (const participant of participants) {
        const score = await calculateDSAScore(roomId, participant.userId);
        finalScores[participant.userId] = {
          score: score.totalScore,
          submissionCount: score.submissionCount,
          acceptedCount: score.acceptedCount,
          details: score.details,
        };

        maxScore = Math.max(maxScore, score.totalScore);
      }

      // Create final leaderboard
      const leaderboard = Object.entries(finalScores)
        .map(([userId, data]) => ({
          userId,
          score: data.score,
          rank: 0, // Will be assigned after sorting
          submissionCount: data.submissionCount,
          acceptedCount: data.acceptedCount,
        }))
        .sort((a, b) => b.score - a.score)
        .map((entry, index) => ({ ...entry, rank: index + 1 }));

      // Update room with final leaderboard
      const roomRef = db.collection("dsa_rooms").doc(roomId);
      transaction.update(roomRef, {
        status: "completed",
        finalLeaderboard: leaderboard,
        maxScore,
        completedAt: admin.firestore.FieldValue.serverTimestamp(),
        scoringMethod: "server-validated", // Indicate scores are server-calculated
      });

      // Update participant stats
      for (const entry of leaderboard) {
        const statsRef = db.collection("dsa_stats").doc(entry.userId);
        const statsDoc = await transaction.get(statsRef);

        if (statsDoc.exists) {
          const stats = statsDoc.data();
          transaction.update(statsRef, {
            totalSessions: (stats.totalSessions || 0) + 1,
            totalScore: (stats.totalScore || 0) + entry.score,
            highestScore: Math.max(stats.highestScore || 0, entry.score),
            averageScore:
              ((stats.totalScore || 0) + entry.score) / ((stats.totalSessions || 0) + 1),
            lastGameRank: entry.rank,
            lastGameScore: entry.score,
            lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
          });
        } else {
          transaction.set(statsRef, {
            userId: entry.userId,
            totalSessions: 1,
            totalScore: entry.score,
            highestScore: entry.score,
            averageScore: entry.score,
            lastGameRank: entry.rank,
            lastGameScore: entry.score,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        }
      }

      return {
        success: true,
        leaderboard,
        scoringMethod: "server-validated",
      };
    });

    return result;
  } catch (error) {
    throw new Error(`Failed to finalize session: ${error.message}`);
  }
}

/**
 * Hash code for verification
 * Used to detect code tampering
 */
async function hashCode(code) {
  const encoder = new TextEncoder();
  const data = encoder.encode(code);

  // Use SubtleCrypto for hashing in Node.js/browser
  try {
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  } catch {
    // Fallback for environments without SubtleCrypto
    const crypto = require("crypto");
    return crypto.createHash("sha256").update(code).digest("hex");
  }
}

/**
 * Validate score range
 */
export function isValidScoreRange(score) {
  return typeof score === "number" && score >= 0 && score <= 10000;
}

/**
 * Get score multipliers based on performance
 */
export function getScoreMultiplier(accuracy, timeBonus) {
  let multiplier = 1;

  if (accuracy > 95) {
    multiplier += 0.25;
  } else if (accuracy > 85) {
    multiplier += 0.15;
  }

  if (timeBonus) {
    multiplier *= POINT_VALUES.TIME_BONUS_MULTIPLIER;
  }

  return multiplier;
}

/**
 * Prevent score manipulation by validating submission timing
 */
export function validateSubmissionTiming(submissions) {
  const timings = submissions.map((s) => s.timeFromStart);

  // Check for unrealistic submissions
  for (let i = 1; i < timings.length; i++) {
    // Time should only increase
    if (timings[i] < timings[i - 1]) {
      return false;
    }

    // Check for suspiciously fast solutions (less than 10 seconds apart)
    if (timings[i] - timings[i - 1] < 10000) {
      console.warn(
        `Suspicious submission timing: ${timings[i] - timings[i - 1]}ms between solutions`
      );
    }
  }

  return true;
}
