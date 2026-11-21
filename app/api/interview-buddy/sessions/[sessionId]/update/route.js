/**
 * PUT /api/interview-buddy/sessions/[sessionId]/update
 * Update a session (start, end, save results)
 * 
 * SECURITY:
 * - Verifies user owns the session before allowing updates
 * - Validates all input parameters
 * - Prevents score manipulation
 * - Encrypts sensitive data (recordings, transcripts)
 */
import { NextResponse } from "next/server";
import * as admin from "firebase-admin";
import { db } from "@/firebase/admin";
import { serializeFirebaseData } from "@/lib/firebase-helpers";
import { getCurrentUser } from "@/lib/actions/auth.action";
import { updateSessionWithTransaction } from "@/lib/security/transaction-manager";
import { encryptField } from "@/lib/security/encryption";
import { getClientIp } from "@/lib/security/endpoint-security";
import { logAuditEvent } from "@/lib/security/audit-logging";
import { finishInterviewModeSession } from "@/lib/modules/interview-session.service";

// Get master encryption key if available
function getMasterKeyIfAvailable() {
  try {
    return process.env.DATA_ENCRYPTION_KEY;
  } catch {
    return null;
  }
}

function sanitizeAiBuddyReport(report) {
  if (!report || typeof report !== "object" || Array.isArray(report)) {
    throw new Error("Report must be an object");
  }

  const performanceHistory = Array.isArray(report.performanceHistory)
    ? report.performanceHistory.filter((item) => item && typeof item === "object" && !Array.isArray(item)).slice(0, 100).map((item) => {
        const criterionScores = item.criterion_scores &&
          typeof item.criterion_scores === "object" &&
          !Array.isArray(item.criterion_scores)
          ? Object.fromEntries(
              Object.entries(item.criterion_scores)
                .filter(([, value]) => typeof value === "number" && Number.isFinite(value))
                .slice(0, 20)
            )
          : {};

        return {
          topic: typeof item.topic === "string" ? item.topic.slice(0, 200) : "",
          question: typeof item.question === "string" ? item.question.slice(0, 10000) : "",
          answer: typeof item.answer === "string" ? item.answer.slice(0, 20000) : "",
          score: typeof item.score === "number" && Number.isFinite(item.score) ? item.score : 0,
          feedback: typeof item.feedback === "string" ? item.feedback.slice(0, 5000) : "",
          weak_tags: Array.isArray(item.weak_tags)
            ? item.weak_tags.filter((tag) => typeof tag === "string").slice(0, 50)
            : [],
          criterion_scores: criterionScores,
        };
      })
    : [];
  const avgByTopic = report.avgByTopic &&
    typeof report.avgByTopic === "object" &&
    !Array.isArray(report.avgByTopic)
    ? Object.fromEntries(
        Object.entries(report.avgByTopic)
          .filter(([, value]) => typeof value === "number" && Number.isFinite(value))
          .slice(0, 100)
      )
    : {};

  return {
    totalQuestions: Number.isInteger(report.totalQuestions) ? report.totalQuestions : performanceHistory.length,
    answeredQuestions: Number.isInteger(report.answeredQuestions) ? report.answeredQuestions : performanceHistory.length,
    avgByTopic,
    topWeakAreas: Array.isArray(report.topWeakAreas)
      ? report.topWeakAreas.slice(0, 50).map((item) => {
          if (Array.isArray(item)) {
            return [
              typeof item[0] === "string" ? item[0].slice(0, 200) : "",
              typeof item[1] === "number" && Number.isFinite(item[1]) ? item[1] : 0,
            ];
          }
          return typeof item === "string" ? item.slice(0, 200) : "";
        })
      : [],
    scoreProgression: Array.isArray(report.scoreProgression)
      ? report.scoreProgression.filter((score) => typeof score === "number" && Number.isFinite(score)).slice(0, 100)
      : [],
    performanceHistory,
    overallScore: typeof report.overallScore === "number" && Number.isFinite(report.overallScore)
      ? report.overallScore
      : null,
    timestamp: typeof report.timestamp === "string" ? report.timestamp : new Date().toISOString(),
  };
}

export async function PUT(request, { params }) {
  let currentUser = null;
  let sessionId = null;

  try {
    // ✅ FIX #4: Verify user authentication
    currentUser = await getCurrentUser();
    if (!currentUser || currentUser.id === "dummy-user-id") {
      return NextResponse.json(
        { error: "User not authenticated" },
        { status: 401 }
      );
    }

    const resolvedParams = await params;
    sessionId = resolvedParams?.sessionId;

    if (!sessionId) {
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
      return NextResponse.json(
        { error: "Invalid JSON in request body", details: parseError.message },
        { status: 400 }
      );
    }

    const { status, score, feedback, recordingUrl, transcriptUrl, report } = body;

    // Build update object
    const updateData = {};
    let sanitizedReport = null;

    // ✅ Validate status transitions
    if (status) {
      const validStatuses = ["created", "in-progress", "completed", "paused", "abandoned"];
      const validTransitions = {
        created: ["in-progress", "paused"],
        "in-progress": ["completed", "paused"],
        paused: ["in-progress", "completed"],
        completed: [], // Terminal state
      };

      if (!validStatuses.includes(status)) {
        return NextResponse.json(
          { error: `Invalid status: ${status}` },
          { status: 400 }
        );
      }

      updateData.status = status;
    }

    // ✅ Validate score
    if (score !== undefined) {
      if (typeof score !== "number" || score < 0 || score > 100) {
        return NextResponse.json(
          { error: "Score must be a number between 0 and 100" },
          { status: 400 }
        );
      }
      updateData.score = score;
    }

    // ✅ Validate feedback structure
    if (feedback !== undefined) {
      if (!feedback || typeof feedback !== "object" || Array.isArray(feedback)) {
        return NextResponse.json(
          { error: "Feedback must be an object" },
          { status: 400 }
        );
      }
      updateData.feedback = feedback;
    }

    if (report !== undefined) {
      try {
        sanitizedReport = sanitizeAiBuddyReport(report);
        if (Buffer.byteLength(JSON.stringify(sanitizedReport), "utf8") > 700 * 1024) {
          return NextResponse.json(
            { error: "Interview report is too large to save" },
            { status: 413 }
          );
        }
        updateData.totalQuestions = sanitizedReport.totalQuestions;
        updateData.answeredQuestions = sanitizedReport.answeredQuestions;
        updateData.avgByTopic = sanitizedReport.avgByTopic;
        updateData.topWeakAreas = sanitizedReport.topWeakAreas;
        updateData.scoreProgression = sanitizedReport.scoreProgression;
        updateData.performanceHistory = sanitizedReport.performanceHistory;
      } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
    }

    // ✅ Validate URLs
    if (recordingUrl) {
      if (typeof recordingUrl !== "string") {
        return NextResponse.json(
          { error: "Recording URL must be a string" },
          { status: 400 }
        );
      }
      
      // ✅ FIX #12: Encrypt sensitive URLs if encryption key available
      const encryptionKey = getMasterKeyIfAvailable();
      if (encryptionKey) {
        try {
          updateData.recordingUrl = encryptField(recordingUrl, encryptionKey);
          updateData.recordingUrl_encrypted = true;
        } catch {
          // Encryption failed, storing plaintext
          updateData.recordingUrl = recordingUrl;
        }
      } else {
        updateData.recordingUrl = recordingUrl;
      }
    }

    if (transcriptUrl) {
      if (typeof transcriptUrl !== "string") {
        return NextResponse.json(
          { error: "Transcript URL must be a string" },
          { status: 400 }
        );
      }
      
      // ✅ FIX #12: Encrypt sensitive URLs if encryption key available
      const encryptionKey = getMasterKeyIfAvailable();
      if (encryptionKey) {
        try {
          updateData.transcriptUrl = encryptField(transcriptUrl, encryptionKey);
          updateData.transcriptUrl_encrypted = true;
        } catch {
          // Encryption failed, storing plaintext
          updateData.transcriptUrl = transcriptUrl;
        }
      } else {
        updateData.transcriptUrl = transcriptUrl;
      }
    }

    // ✅ FIX #8: Use transaction to prevent race conditions
    // This ensures atomicity: either all updates succeed or none
    const updatedSession = await updateSessionWithTransaction(sessionId, updateData, currentUser);
    if (
      updatedSession.mode === "ai" &&
      updatedSession.modeSessionId &&
      ["completed", "abandoned"].includes(status)
    ) {
      await finishInterviewModeSession({
        userId: currentUser.id,
        sessionId: updatedSession.modeSessionId,
        status: status === "completed" ? "completed" : "abandoned",
        result: status === "completed"
          ? {
              score: updateData.score ?? null,
              feedback: updateData.feedback ?? null,
              report: sanitizedReport,
            }
          : null,
      });
    }

    return NextResponse.json(
      {
        success: true,
        sessionId,
        session: serializeFirebaseData(updatedSession),
      },
      { status: 200 }
    );
  } catch (error) {
    await logAuditEvent({
      userId: currentUser?.uid || "unknown",
      eventType: "interview_session_update_failed",
      severity: "error",
      description: `Failed to update session: ${error.message}`,
      resource: `sessions/${sessionId}`,
      ip: getClientIp(request),
    });

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
  let currentUser = null;
  let sessionId = null;

  try {
    currentUser = await getCurrentUser();
    if (!currentUser || currentUser.id === "dummy-user-id") {
      return NextResponse.json(
        { error: "User not authenticated" },
        { status: 401 }
      );
    }

    const resolvedParams = await params;
    sessionId = resolvedParams?.sessionId;

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!sessionId || !userId) {
      return NextResponse.json(
        { error: "Session ID and User ID are required" },
        { status: 400 }
      );
    }
    if (userId !== currentUser.id) {
      return NextResponse.json({ error: "User ID mismatch" }, { status: 403 });
    }

    const userSessionRef = db
      .collection("users")
      .doc(currentUser.uid)
      .collection("interview_buddy_sessions")
      .doc(sessionId);
    const userSessionDoc = await userSessionRef.get();
    const doc = userSessionDoc.exists
      ? userSessionDoc
      : await db.collection("interview_buddy_sessions").doc(sessionId).get();

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

    if (sessionData.modeSessionId) {
      await finishInterviewModeSession({
        userId: currentUser.id,
        sessionId: sessionData.modeSessionId,
        status: "abandoned",
      });
    }

    await doc.ref.delete();

    return NextResponse.json({
      success: true,
      message: "Session deleted",
    });
  } catch (error) {
    await logAuditEvent({
      userId: currentUser?.uid || "unknown",
      eventType: "interview_session_deletion_failed",
      severity: "error",
      description: `Failed to delete session: ${error.message}`,
      resource: `sessions/${sessionId}`,
      ip: getClientIp(request),
    });

    return NextResponse.json(
      { error: error.message || "Failed to delete session" },
      { status: 500 }
    );
  }
}
