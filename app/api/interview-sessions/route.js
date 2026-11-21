import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/actions/auth.action";
import {
  getActiveInterviewModeSessions,
  getInterviewModeSession,
  getInterviewModeSessions,
} from "@/lib/modules/interview-session.service";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const user = await getCurrentUser();
    if (!user?.id || user.id === "dummy-user-id") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    if (searchParams.get("debug") === "true") {
      const [activeSessions, recentSessions] = await Promise.all([
        getActiveInterviewModeSessions(user.id),
        getInterviewModeSessions({ userId: user.id, limit: 20 }),
      ]);

      return NextResponse.json({
        userId: user.id,
        activeThreadIds: activeSessions.map((session) => session.sessionId),
        recentThreadIds: recentSessions.map((session) => session.sessionId),
      });
    }

    const sessionId = searchParams.get("sessionId");
    if (sessionId) {
      const session = await getInterviewModeSession({ userId: user.id, sessionId });
      return NextResponse.json({ session });
    }

    if (searchParams.get("activeOnly") === "true") {
      const sessions = await getActiveInterviewModeSessions(user.id);
      return NextResponse.json({ sessions });
    }

    const requestedLimit = Number(searchParams.get("limit") || 20);
    if (!Number.isInteger(requestedLimit) || requestedLimit < 1 || requestedLimit > 50) {
      return NextResponse.json({ error: "Limit must be between 1 and 50" }, { status: 400 });
    }

    const sessions = await getInterviewModeSessions({
      userId: user.id,
      mode: searchParams.get("mode") || undefined,
      limit: requestedLimit,
    });
    return NextResponse.json({ sessions });
  } catch (error) {
    console.error("Error fetching interview sessions:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch interview sessions" },
      { status: 500 }
    );
  }
}
