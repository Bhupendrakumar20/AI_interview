/**
 * GET /api/interview-buddy/proctoring/report/[sessionId]
 * Get proctoring report for a session
 * 
 * SECURITY:
 * - Only session creator or admin can view report
 * - Returns comprehensive violation history
 */

import { NextResponse } from "next/server";
import { db } from "@/firebase/admin";
import { getCurrentUser } from "@/lib/actions/auth.action";
import { getProctoringReport } from "@/lib/security/proctoring-validation";

export async function GET(request, { params }) {
  try {
    // ✅ Verify user authentication
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
      return NextResponse.json(
        { error: "Session ID is required" },
        { status: 400 }
      );
    }

    // ✅ Verify user is session creator or admin
    const sessionRef = db.collection("interview_buddy_sessions").doc(sessionId);
    const sessionDoc = await sessionRef.get();

    if (!sessionDoc.exists) {
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    const sessionData = sessionDoc.data();

    // Only creator can view proctoring report
    if (sessionData.createdBy !== currentUser.uid) {
      return NextResponse.json(
        { error: "You do not have permission to view this report" },
        { status: 403 }
      );
    }

    // ✅ Get comprehensive proctoring report
    const report = await getProctoringReport(sessionId);

    return NextResponse.json(
      {
        success: true,
        sessionId,
        report: {
          ...report,
          sessionData: {
            createdAt: sessionData.createdAt,
            status: sessionData.status,
            participantCount: sessionData.participants?.length || 1,
          },
        },
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[GET /api/interview-buddy/proctoring/report] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to retrieve proctoring report" },
      { status: 500 }
    );
  }
}
