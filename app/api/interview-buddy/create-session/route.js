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

/**
 * Ensures session code is unique in database
 * Generates new codes until finding one that doesn't exist
 */
async function generateUniqueSessionCode() {
  let code;
  let isUnique = false;
  let attempts = 0;
  const maxAttempts = 10;

  while (!isUnique && attempts < maxAttempts) {
    code = generateSessionCode();
    
    // Check if code already exists
    const existingSession = await db
      .collection("interview_buddy_sessions")
      .where("sessionCode", "==", code)
      .limit(1)
      .get();
    
    isUnique = existingSession.empty;
    attempts++;
  }

  if (!isUnique) {
    throw new Error("Failed to generate unique session code after multiple attempts");
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

    // 🔥 Generate UNIQUE session code - ensures no two sessions have same code
    const sessionCode = mode === "human" ? await generateUniqueSessionCode() : null;

    console.log(`[create-session] Generated unique session code: ${sessionCode} for user ${userId}`);

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

    // 🔗 Generate invite link for sharing
    const origin = request.headers.get("origin") || "https://ai-interview-git-pr-d49414-errorbhupendra481-gmailcoms-projects.vercel.app";
    const inviteLink = `${origin}/interview/buddy/${sessionCode}`;

    console.log(`[create-session] Generated invite link: ${inviteLink}`);

    return NextResponse.json(
      {
        sessionId: sessionRef.id,
        sessionCode,
        inviteLink, // 🔗 NEW: Direct invite link for sharing
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
