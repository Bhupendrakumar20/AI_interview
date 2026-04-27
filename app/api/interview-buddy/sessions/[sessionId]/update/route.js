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
    const { sessionId } = params;
    const { status, score, feedback, recordingUrl, transcriptUrl } = await request.json();

    if (!sessionId) {
      return NextResponse.json(
        { error: "Session ID is required" },
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
    if (feedback) updateData.feedback = feedback;
    if (recordingUrl) updateData.recordingUrl = recordingUrl;
    if (transcriptUrl) updateData.transcriptUrl = transcriptUrl;

    await doc.ref.update(updateData);

    const updatedDoc = await doc.ref.get();

    return NextResponse.json({
      id: sessionId,
      ...serializeFirebaseData(updatedDoc.data()),
      success: true,
    });
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
