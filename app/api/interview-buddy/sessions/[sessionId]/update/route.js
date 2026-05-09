/**
 * PUT /api/interview-buddy/sessions/[sessionId]/update
 * Update a session (start, end, save results)
 * 
 * SECURITY:
 * - Verifies user owns the session before allowing updates
 * - Validates all input parameters
 * - Prevents score manipulation
 */
import { NextResponse } from "next/server";
import * as admin from "firebase-admin";
import { db } from "@/firebase/admin";
import { serializeFirebaseData } from "@/lib/firebase-helpers";
import { getCurrentUser } from "@/lib/actions/auth.action";

export async function PUT(request, { params }) {
  try {
    // ✅ FIX #4: Verify user authentication
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json(
        { error: "User not authenticated" },
        { status: 401 }
      );
    }

    // Handle both sync and async params (Next.js 14/15 vs 16)
    const sessionId = params?.sessionId || (await params)?.sessionId;

    if (!sessionId) {
      console.error("❌ Session ID is required but missing");
      return NextResponse.json(
        { error: "Session ID is required" },
        { status: 400 }
      );
    }

    // Parse request body
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      console.error("❌ Failed to parse request body:", parseError.message);
      return NextResponse.json(
        { error: "Invalid JSON in request body", details: parseError.message },
        { status: 400 }
      );
    }

    const { status, score, feedback, recordingUrl, transcriptUrl } = body;

    const doc = await db.collection("interview_buddy_sessions").doc(sessionId).get();

    if (!doc.exists) {
      console.error("❌ Session not found:", sessionId);
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    const sessionData = doc.data();

    // ✅ FIX #3: CRITICAL - Verify ownership before allowing updates
    if (sessionData.createdBy !== currentUser.uid) {
      console.error(
        `❌ UNAUTHORIZED: User ${currentUser.uid} attempted to update session created by ${sessionData.createdBy}`
      );
      return NextResponse.json(
        { error: "You do not have permission to update this session" },
        { status: 403 }
      );
    }

    // ✅ Validate status transitions
    const validStatuses = ["created", "in-progress", "completed", "paused"];
    const currentStatus = sessionData.status;
    const validTransitions = {
      created: ["in-progress", "paused"],
      "in-progress": ["completed", "paused"],
      paused: ["in-progress", "completed"],
      completed: [], // Terminal state
    };

    if (status && !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status: ${status}` },
        { status: 400 }
      );
    }

    if (status && !validTransitions[currentStatus]?.includes(status)) {
      return NextResponse.json(
        {
          error: `Cannot transition from ${currentStatus} to ${status}`,
          validTransitions: validTransitions[currentStatus],
        },
        { status: 400 }
      );
    }

    // ✅ Validate score
    if (score !== undefined) {
      if (typeof score !== "number" || score < 0 || score > 100) {
        return NextResponse.json(
          { error: "Score must be a number between 0 and 100" },
          { status: 400 }
        );
      }
    }

    // ✅ Validate feedback structure
    if (feedback !== undefined && typeof feedback !== "object") {
      return NextResponse.json(
        { error: "Feedback must be an object" },
        { status: 400 }
      );
    }

    // ✅ Validate URLs
    if (recordingUrl && typeof recordingUrl !== "string") {
      return NextResponse.json(
        { error: "Recording URL must be a string" },
        { status: 400 }
      );
    }

    if (transcriptUrl && typeof transcriptUrl !== "string") {
      return NextResponse.json(
        { error: "Transcript URL must be a string" },
        { status: 400 }
      );
    }

    // Build update object
    const updateData = {
      updatedAt: new Date(),
    };

    if (status) updateData.status = status;
    if (score !== undefined) updateData.score = score;
    if (feedback) updateData.feedback = feedback;
    if (recordingUrl) updateData.recordingUrl = recordingUrl;
    if (transcriptUrl) updateData.transcriptUrl = transcriptUrl;

    // ✅ Update session
    await doc.ref.update(updateData);

    const updatedSession = await doc.ref.get();

    return NextResponse.json(
      {
        success: true,
        sessionId,
        session: serializeFirebaseData(updatedSession.data()),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating session:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update session" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/interview-buddy/sessions/[sessionId]
 * Delete a session (only creator)
 */
export async function DELETE(request, { params }) {
  try {
    const { sessionId } = params;
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!sessionId || !userId) {
      return NextResponse.json(
        { error: "Session ID and User ID are required" },
        { status: 400 }
      );
    }

    const doc = await db.collection("interview_buddy_sessions").doc(sessionId).get();

    if (!doc.exists) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    const sessionData = doc.data();

    if (sessionData.createdBy !== userId) {
      return NextResponse.json(
        { error: "Only session creator can delete the session" },
        { status: 403 }
      );
    }

    await doc.ref.delete();

    return NextResponse.json({
      success: true,
      message: "Session deleted",
    });
  } catch (error) {
    console.error("Error deleting session:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete session" },
      { status: 500 }
    );
  }
}
