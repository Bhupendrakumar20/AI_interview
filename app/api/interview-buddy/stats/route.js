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

    const query = await db
      .collection("interview_buddy_sessions")
      .where("participants", "array-contains", userId)
      .get();

    const sessions = query.docs.map((doc) => doc.data());

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
        // Ensure score is always a number (not null)
        const score = typeof session.score === 'number' ? session.score : 0;
        
        return {
        mode: session.mode,
        persona: session.persona,
        topics: session.topics,
        difficulty: session.difficulty,
        score: score, // Force to number
        status: session.status,
        duration: session.duration || 0,
        // Convert Firestore timestamp to ISO string
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
