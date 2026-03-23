/**
 * POST /api/interview-buddy/create-session
 * Create a new interview buddy session
 */
import { NextResponse } from "next/server";
import * as admin from "firebase-admin";
import { db } from "@/firebase/admin";

function generateSessionCode() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "IB-";
  for (let i = 0; i < 5; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export async function POST(request) {
  try {
    const {
      userId,
      mode = "ai",
      persona = "hiring-manager",
      topics = [],
      difficulty = "medium",
      duration = 30,
      jobDescription = null,
    } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 });
    }

    const sessionCode = mode === "human" ? generateSessionCode() : null;

    const sessionRef = await db.collection("interview_buddy_sessions").add({
      createdBy: userId,
      mode,
      persona,
      topics,
      difficulty,
      duration,
      jobDescription,
      sessionCode,
      status: "created",
      startTime: null,
      endTime: null,
      participants: [userId],
      score: null,
      feedback: null,
      recordingUrl: null,
      transcriptUrl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return NextResponse.json(
      {
        sessionId: sessionRef.id,
        sessionCode,
        success: true,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating session:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create session" },
      { status: 500 }
    );
  }
}
