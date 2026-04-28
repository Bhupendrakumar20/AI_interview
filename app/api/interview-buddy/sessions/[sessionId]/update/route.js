/**
 * PUT /api/interview-buddy/sessions/[sessionId]/update
 * Update a session (start, end, save results)
 */
import { NextResponse } from "next/server";
import * as admin from "firebase-admin";
import { db } from "@/firebase/admin";
import { serializeFirebaseData } from "@/lib/firebase-helpers";

export async function PUT(request, { params }) {
  try {
    // ⚠️ Debug: Log params structure
    console.log("📋 [PUT /update] params:", JSON.stringify(params));
    console.log("📋 [PUT /update] params type:", typeof params);
    console.log("📋 [PUT /update] params keys:", Object.keys(params || {}));

    // Handle both sync and async params (Next.js 14/15 vs 16)
    const sessionId = params?.sessionId || (await params)?.sessionId;
    console.log("📋 [PUT /update] Extracted sessionId:", sessionId);

    if (!sessionId) {
      console.error("❌ [PUT /update] Session ID is required but missing");
      return NextResponse.json(
        { error: "Session ID is required" },
        { status: 400 }
      );
    }

    // Parse request body
    let body;
    try {
      body = await request.json();
      console.log("📋 [PUT /update] Request body keys:", Object.keys(body));
      console.log("📋 [PUT /update] status:", body.status);
      console.log("📋 [PUT /update] score:", body.score);
      console.log("📋 [PUT /update] feedback type:", typeof body.feedback);
      console.log("📋 [PUT /update] feedback keys:", body.feedback ? Object.keys(body.feedback) : "null");
    } catch (parseError) {
      console.error("❌ [PUT /update] Failed to parse request body:", parseError.message);
      return NextResponse.json(
        { error: "Invalid JSON in request body", details: parseError.message },
        { status: 400 }
      );
    }

    const { status, score, feedback, recordingUrl, transcriptUrl } = body;

    const doc = await db.collection("interview_buddy_sessions").doc(sessionId).get();

    if (!doc.exists) {
      console.error("❌ [PUT /update] Session not found:", sessionId);
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    const updateData = {
      updatedAt: new Date(),
    };

    if (status) {
      updateData.status = status;
      if (status === "in-progress") {
        updateData.startTime = !doc.data().startTime ? new Date() : doc.data().startTime;
      } else if (status === "completed") {
        updateData.endTime = new Date();
        
        // Calculate actual duration in minutes
        const startTime = doc.data().startTime || doc.data().createdAt;
        if (startTime) {
          const start = startTime.toDate?.() || new Date(startTime);
          const end = new Date();
          const durationMinutes = Math.round((end - start) / 60000); // Convert ms to minutes
          updateData.duration = Math.max(1, durationMinutes); // At least 1 minute
        }
      }
    }

    if (score !== undefined) updateData.score = score;
    
    // Clean feedback object - only keep serializable fields
    if (feedback) {
      console.log("📋 [PUT /update] Processing feedback object...");
      try {
        // Remove non-serializable fields from feedback
        const cleanFeedback = {
          totalScore: feedback.totalScore,
          categoryScores: feedback.categoryScores,
          strengths: feedback.strengths,
          areasForImprovement: feedback.areasForImprovement,
          finalAssessment: feedback.finalAssessment,
          // Note: Exclude success, feedbackId as they're internal
        };
        updateData.feedback = cleanFeedback;
        console.log("✅ [PUT /update] Feedback cleaned and ready for Firebase");
      } catch (feedbackError) {
        console.error("❌ [PUT /update] Error processing feedback:", feedbackError.message);
        // Still try to save without feedback if it fails
        console.warn("⚠️ [PUT /update] Continuing without feedback due to processing error");
      }
    }
    
    if (recordingUrl) updateData.recordingUrl = recordingUrl;
    if (transcriptUrl) updateData.transcriptUrl = transcriptUrl;

    console.log("📋 [PUT /update] Updating Firebase with:", Object.keys(updateData));
    await doc.ref.update(updateData);
    console.log("✅ [PUT /update] Firebase update successful");

    const updatedDoc = await doc.ref.get();
    const serialized = serializeFirebaseData(updatedDoc.data());

    console.log("✅ [PUT /update] Session updated successfully:", sessionId);
    return NextResponse.json({
      id: sessionId,
      ...serialized,
      success: true,
    });
  } catch (error) {
    console.error("❌ [PUT /update] Error updating session:", error);
    console.error("    Stack:", error.stack);
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
