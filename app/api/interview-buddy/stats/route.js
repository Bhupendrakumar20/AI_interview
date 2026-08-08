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

    const interviewsByParticipantsQuery = await db
      .collection("interviews")
      .where("participants", "array-contains", userId)
      .get();

    const interviewsByOwnerQuery = await db
      .collection("interviews")
      .where("userId", "==", userId)
      .get();

    const userInterviewsQuery = await db
      .collection("users")
      .doc(userId)
      .collection("interviews")
      .get();

    const buddySessionsQuery = await db
      .collection("interview_buddy_sessions")
      .where("participants", "array-contains", userId)
      .get();

    const legacyUserSessionsQuery = await db
      .collection("users")
      .doc(userId)
      .collection("interview_buddy_sessions")
      .get();

    const normalizeStatus = (status, finalized, completedAt) => {
      const completedStatuses = new Set([
        "completed",
        "feedback_generated",
        "finalized",
        "done",
        "finished",
      ]);
      if (typeof status === "string") {
        const normalizedStatus = status.toLowerCase();
        if (completedStatuses.has(normalizedStatus)) return "completed";
        if (["created", "setup_completed", "in-progress", "in_progress", "started", "pending"].includes(normalizedStatus)) return normalizedStatus;
      }
      if (finalized || completedAt) return "completed";
      return "created";
    };

    const normalizeScore = (data) => {
      if (typeof data.score === "number") return data.score;
      if (typeof data.finalScore === "number") return data.finalScore;
      if (typeof data.totalScore === "number") return data.totalScore;
      if (typeof data.scored === "number") return data.scored;
      if (typeof data.scores?.normalized === "number") return data.scores.normalized;
      if (typeof data.scores?.totalScore === "number") return data.scores.totalScore;
      if (typeof data.result?.score === "number") return data.result.score;
      return null;
    };

    const normalizeDuration = (data) => {
      return (
        Number(data.duration) ||
        Number(data.sessionDuration) ||
        Number(data.timeTaken) ||
        Number(data.totalMinutes) ||
        0
      );
    };

    const normalizeTopics = (data) => {
      if (Array.isArray(data.topics)) return data.topics;
      if (Array.isArray(data.techstack)) return data.techstack;
      if (typeof data.domain === "string" && data.domain.trim()) return [data.domain.trim()];
      if (typeof data.topic === "string" && data.topic.trim()) return [data.topic.trim()];
      return [];
    };

    const normalizeSession = (doc, source) => {
      const data = doc.data();
      return {
        id: doc.id,
        _source: source,
        mode: data.mode || (data.type === "human" ? "human" : "ai"),
        persona: data.persona || data.type || "ai",
        topics: normalizeTopics(data),
        difficulty: data.difficulty || data.level || "medium",
        score: normalizeScore(data),
        status: normalizeStatus(data.status, data.finalized, data.completedAt),
        duration: normalizeDuration(data),
        createdAt: data.createdAt || data.completedAt || new Date().toISOString(),
      };
    };

    const sessionMap = new Map();
    const sessionSources = [
      ...interviewsByParticipantsQuery.docs.map((doc) => normalizeSession(doc, "interviews-by-participant")),
      ...interviewsByOwnerQuery.docs.map((doc) => normalizeSession(doc, "interviews-by-owner")),
      ...userInterviewsQuery.docs.map((doc) => normalizeSession(doc, "user-interviews")),
      ...buddySessionsQuery.docs.map((doc) => normalizeSession(doc, "buddy-sessions")),
      ...legacyUserSessionsQuery.docs.map((doc) => normalizeSession(doc, "user-legacy")),
    ];

    sessionSources.forEach((session) => {
      if (!sessionMap.has(session.id)) {
        sessionMap.set(session.id, session);
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
        stats.sessionsByDifficulty[session.difficulty] =
          (stats.sessionsByDifficulty[session.difficulty] || 0) + 1;
      }

      // Collect topics
      if (session.topics && Array.isArray(session.topics)) {
        session.topics.forEach((topic) => stats.topicsCovered.add(topic));
      }

      // Calculate total practice time
      if (session.duration) {
        stats.totalPracticeTime += session.duration;
      }

      // Calculate average score
      if (session.score !== null && session.score !== undefined) {
        totalScore += session.score;
        scoredSessions++;
      }
    });

    stats.topicsCovered = Array.from(stats.topicsCovered);
    stats.avgScore = scoredSessions > 0 ? Math.round(totalScore / scoredSessions) : 0;

    // Get recent sessions (last 3)
    stats.recentSessions = sessions
      .sort((a, b) => {
        const aTime = a.createdAt?.toMillis?.() || new Date(a.createdAt).getTime() || 0;
        const bTime = b.createdAt?.toMillis?.() || new Date(b.createdAt).getTime() || 0;
        return bTime - aTime;
      })
      .slice(0, 3)
      .map((session) => {
        const score = typeof session.score === 'number' ? session.score : 0;
        return {
          mode: session.mode,
          persona: session.persona,
          topics: session.topics,
          difficulty: session.difficulty,
          score: score,
          status: session.status,
          duration: session.duration || 0,
          createdAt: session.createdAt
            ? (session.createdAt.toDate?.() || new Date(session.createdAt)).toISOString()
            : new Date().toISOString(),
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
