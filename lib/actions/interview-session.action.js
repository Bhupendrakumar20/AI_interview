"use server";

import { getCurrentUser } from "@/lib/actions/auth.action";
import {
  finishInterviewModeSession,
  getActiveInterviewModeSessions,
  getInterviewModeSession,
  getInterviewModeSessions,
  startInterviewModeSession,
} from "@/lib/modules/interview-session.service";

async function getAuthenticatedUser(expectedUserId) {
  const user = await getCurrentUser();
  if (!user || !user.id || user.id === "dummy-user-id") return null;
  if (expectedUserId && expectedUserId !== user.id) return null;
  return user;
}

export async function startInterviewModeSessionAction({
  mode,
  expectedUserId,
  sessionId,
  resourceId,
  details,
}) {
  try {
    const user = await getAuthenticatedUser(expectedUserId);
    if (!user) return { success: false, error: "Unauthorized" };

    const session = await startInterviewModeSession({
      userId: user.id,
      mode,
      sessionId,
      resourceId,
      details,
    });
    return { success: true, userId: user.id, ...session };
  } catch (error) {
    if (error.name === "ActiveInterviewRoundError") {
      return {
        success: false,
        error: error.message,
        activeRound: error.activeRound,
      };
    }
    if (error.name === "ActiveInterviewModeError") {
      return { success: false, error: error.message, activeMode: error.activeMode };
    }
    console.error("Error starting interview mode session:", error);
    return { success: false, error: error.message || "Failed to start session" };
  }
}

export async function finishInterviewModeSessionAction({
  sessionId,
  status = "completed",
  result = null,
}) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return { success: false, error: "Unauthorized" };

    if (result !== null) {
      const serializedResult = JSON.stringify(result);
      if (
        typeof serializedResult !== "string" ||
        Buffer.byteLength(serializedResult, "utf8") > 700 * 1024
      ) {
        return { success: false, error: "Interview results are too large to save" };
      }
    }

    const session = await finishInterviewModeSession({
      userId: user.id,
      sessionId,
      status,
      result,
    });
    return { success: true, session };
  } catch (error) {
    console.error("Error finishing interview mode session:", error);
    return { success: false, error: error.message || "Failed to finish session" };
  }
}

export async function getInterviewModeSessionsAction({ mode, limit = 20 } = {}) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return { success: false, error: "Unauthorized", sessions: [] };

    const sessions = await getInterviewModeSessions({
      userId: user.id,
      mode,
      limit,
    });
    return { success: true, sessions };
  } catch (error) {
    console.error("Error fetching interview mode sessions:", error);
    return { success: false, error: error.message || "Failed to fetch sessions", sessions: [] };
  }
}

export async function getActiveInterviewModeSessionsAction() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return { success: false, error: "Unauthorized", sessions: [] };

    const sessions = await getActiveInterviewModeSessions(user.id);
    return { success: true, userId: user.id, sessions };
  } catch (error) {
    console.error("Error fetching active interview sessions:", error);
    return { success: false, error: error.message || "Failed to fetch active sessions", sessions: [] };
  }
}

export async function getInterviewSessionDebugContextAction() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return { success: false, error: "Unauthorized" };

    const [activeSessions, recentSessions] = await Promise.all([
      getActiveInterviewModeSessions(user.id),
      getInterviewModeSessions({ userId: user.id, limit: 20 }),
    ]);

    return {
      success: true,
      userId: user.id,
      activeThreadIds: activeSessions.map((session) => session.sessionId),
      recentThreadIds: recentSessions.map((session) => session.sessionId),
    };
  } catch (error) {
    console.error("Error fetching interview session debug context:", error);
    return { success: false, error: error.message || "Failed to fetch session context" };
  }
}

export async function getInterviewModeSessionAction({ sessionId }) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return { success: false, error: "Unauthorized", session: null };

    const session = await getInterviewModeSession({
      userId: user.id,
      sessionId,
    });
    return { success: true, session };
  } catch (error) {
    console.error("Error fetching interview mode session:", error);
    return { success: false, error: error.message || "Failed to fetch session", session: null };
  }
}
