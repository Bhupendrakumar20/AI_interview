"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { finishInterviewModeSessionAction } from "@/lib/actions/interview-session.action";

const MODE_LABELS = {
  "mock-interview": "Mock Interview",
  "mock-test": "Mock Test",
  "ai-buddy-mode": "AI Buddy",
  "resume-round": "Resume Round",
};

export default function ActiveInterviewSessions() {
  const [sessions, setSessions] = useState([]);
  const [endingSessionId, setEndingSessionId] = useState(null);
  const [loadError, setLoadError] = useState("");

  const refreshSessions = useCallback(async () => {
    try {
      const response = await fetch("/api/interview-sessions?activeOnly=true", {
        cache: "no-store",
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to load active sessions");
      }

      setLoadError("");
      setSessions(data.sessions);
    } catch (error) {
      setLoadError(error.message || "Failed to load active sessions");
    }
  }, []);

  useEffect(() => {
    refreshSessions();
  }, [refreshSessions]);

  useEffect(() => {
    if (!sessions.length) return undefined;

    const intervalId = setInterval(() => {
      if (document.visibilityState === "visible") refreshSessions();
    }, 60000);
    return () => clearInterval(intervalId);
  }, [refreshSessions, sessions.length]);

  const handleEndSession = async (sessionId) => {
    setEndingSessionId(sessionId);
    try {
      const response = await finishInterviewModeSessionAction({
        sessionId,
        status: "abandoned",
      });
      if (!response.success) {
        toast.error(response.error || "Failed to end session");
        return;
      }

      toast.success("Interview session ended");
      await refreshSessions();
    } catch (error) {
      console.error("Error ending interview session:", error);
      toast.error(error.message || "Failed to end session");
    } finally {
      setEndingSessionId(null);
    }
  };

  if (!sessions.length && !loadError) return null;

  return (
    <section className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
      <h2 className="font-semibold">Active interview sessions</h2>
      {loadError ? (
        <p className="mt-2 text-sm text-red-400">{loadError}</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {sessions.map((session) => {
            const details = session.details || {};
            const description = [
              details.roundName || details.type,
              details.role || details.persona,
              details.company,
            ].filter(Boolean).join(" · ");

            return (
              <li
                key={session.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card p-3"
              >
                <div>
                  <p className="font-medium">{MODE_LABELS[session.mode] || session.mode}</p>
                  {description && (
                    <p className="text-sm text-muted-foreground">{description}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Started {new Date(session.createdAt).toLocaleString()}
                  </p>
                </div>
                <button
                  type="button"
                  className="rounded-md border border-amber-500/40 px-3 py-1.5 text-sm text-amber-700 hover:bg-amber-500/10 dark:text-amber-300"
                  disabled={endingSessionId === session.id}
                  onClick={() => handleEndSession(session.id)}
                >
                  {endingSessionId === session.id ? "Ending..." : "End session"}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
