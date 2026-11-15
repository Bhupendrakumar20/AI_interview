/**
 * GET /api/interview-buddy/stats
 * Get user's interview buddy statistics
 */
import { NextResponse } from "next/server";
import * as admin from "firebase-admin";
import { db } from "@/firebase/admin";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    // Query from both shared sessions and user subcollection to find all sessions
    const [createdBySnap, participantsSnap, userSubSnap] = await Promise.all([
      db.collection("interview_buddy_sessions")
        .where("createdBy", "==", userId)
        .get()
        .catch(() => ({ docs: [] })),
      db.collection("interview_buddy_sessions")
        .where("participants", "array-contains", userId)
        .get()
        .catch(() => ({ docs: [] })),
      db.collection("users")
        .doc(userId)
        .collection("interview_buddy_sessions")
        .get()
        .catch(() => ({ docs: [] })),
    ]);

    // De-duplicate by document ID and merge best data (e.g. completed over created, has score over 0)
    const sessionMap = new Map();
    [...createdBySnap.docs, ...participantsSnap.docs, ...userSubSnap.docs].forEach((doc) => {
      const data = doc.data();
      const existing = sessionMap.get(doc.id);
      if (!existing) {
        sessionMap.set(doc.id, { id: doc.id, ...data });
      } else {
        // Merge: prefer completed status, higher/valid score, and presence of performanceHistory
        const existingScore = typeof existing.score === "number" ? existing.score : 0;
        const currentScore = typeof data.score === "number" ? data.score : 0;
        const isBetter =
          (data.status === "completed" && existing.status !== "completed") ||
          currentScore > existingScore ||
          (data.performanceHistory && !existing.performanceHistory);
        if (isBetter) {
          sessionMap.set(doc.id, { id: doc.id, ...existing, ...data });
        }
      }
    });

    const sessions = Array.from(sessionMap.values());

    const stats = {
      totalSessions: sessions.length,
      completedSessions: sessions.filter((s) => s.status === "completed").length,
      avgScore: 0,
      totalPracticeTime: 0,
      topicsCovered: new Set(),
      sessionsByMode: {
        human: 0,
        ai: 0,
      },
      sessionsByDifficulty: {
        easy: 0,
        medium: 0,
        hard: 0,
      },
      recentSessions: [],
    };

    let totalScore = 0;
    let scoredSessions = 0;

    sessions.forEach((session) => {
      // Count by mode
      if (session.mode === "human") stats.sessionsByMode.human++;
      else if (session.mode === "ai") stats.sessionsByMode.ai++;

      // Count by difficulty
      if (session.difficulty) {
        const diff = session.difficulty.toLowerCase();
        if (stats.sessionsByDifficulty[diff] !== undefined) {
          stats.sessionsByDifficulty[diff]++;
        }
      }

      // Collect topics
      if (session.topics && Array.isArray(session.topics)) {
        session.topics.forEach((topic) => stats.topicsCovered.add(topic));
      } else if (session.topic) {
        stats.topicsCovered.add(session.topic);
      }

      // Calculate total practice time
      if (session.duration) {
        stats.totalPracticeTime += session.duration;
      }

      // Calculate average score for completed sessions with a score
      if (session.status === "completed" && typeof session.score === "number" && session.score > 0) {
        totalScore += session.score;
        scoredSessions++;
      }
    });

    stats.topicsCovered = Array.from(stats.topicsCovered);
    stats.avgScore = scoredSessions > 0 ? Math.round(totalScore / scoredSessions) : 0;

    // Get sorted recent sessions (up to 50 for full dynamic history)
    stats.recentSessions = sessions
      .sort((a, b) => {
        const aTime = a.createdAt?.toMillis?.() || new Date(a.createdAt || 0).getTime() || 0;
        const bTime = b.createdAt?.toMillis?.() || new Date(b.createdAt || 0).getTime() || 0;
        return bTime - aTime;
      })
      .slice(0, 50)
      .map((session) => {
        const score = typeof session.score === "number" ? Math.round(session.score) : 0;
        const topicList = Array.isArray(session.topics)
          ? session.topics
          : session.topics
          ? [session.topics]
          : session.topic
          ? [session.topic]
          : [];
        const topicFormatted = topicList.length > 0 ? topicList.join(", ") : "DSA";

        let createdAtIso = new Date().toISOString();
        try {
          if (session.createdAt) {
            createdAtIso = (session.createdAt.toDate?.() || new Date(session.createdAt)).toISOString();
          }
        } catch {
          createdAtIso = new Date().toISOString();
        }

        let endTimeIso = null;
        try {
          if (session.endTime) {
            endTimeIso = (session.endTime.toDate?.() || new Date(session.endTime)).toISOString();
          }
        } catch {
          endTimeIso = null;
        }

        return {
          id: session.id,
          sessionId: session.id,
          mode: session.mode || "ai",
          persona: session.persona || "hiring-manager",
          topics: topicList,
          topic: topicFormatted,
          difficulty: session.difficulty || "medium",
          score,
          status: session.status || "created",
          duration: session.duration || 0,
          feedback: session.feedback || null,
          performanceHistory: session.performanceHistory || [],
          avgByTopic: session.avgByTopic || {},
          topWeakAreas: session.topWeakAreas || [],
          scoreProgression: session.scoreProgression || [],
          totalQuestions: session.totalQuestions || 0,
          answeredQuestions: session.answeredQuestions || (session.performanceHistory?.length || 0),
          createdAt: createdAtIso,
          endTime: endTimeIso,
        };
      });

    return NextResponse.json(stats);
  } catch (error) {
    console.error("Error fetching stats:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch stats" },
      { status: 500 }
    );
  }
}
