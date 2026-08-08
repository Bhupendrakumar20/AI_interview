"use client";

import { useEffect, useState } from "react";

export default function InterviewBuddyStats({ userId }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    async function fetchStats() {
      try {
        setLoading(true);
        setError("");

        const res = await fetch(
          `/api/interview-buddy/stats?userId=${encodeURIComponent(userId)}`,
          {
            method: "GET",
            cache: "no-store",
          }
        );

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Failed to fetch statistics");
        }

        setStats(data);
      } catch (err) {
        console.error("Stats error:", err);
        setError(err.message || "Failed to load statistics");
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, [userId]);

  if (loading) {
    return (
      <div className="p-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((item) => (
            <div
              key={item}
              className="h-28 animate-pulse rounded-xl bg-gray-100"
            />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-700">
        <p className="font-semibold">Unable to load statistics</p>
        <p className="mt-1 text-sm">{error}</p>
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6 text-gray-700 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">Interview Buddy</h2>
        <p className="mt-2 text-sm text-gray-500">Sign in to view your interview practice stats and session history.</p>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  const practiceHours = Math.floor(stats.totalPracticeTime / 60);
  const practiceMinutes = stats.totalPracticeTime % 60;

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Interview Buddy</h1>
        <p className="mt-1 text-sm text-gray-500">
          Track your interview practice and performance.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-500">Total Sessions</p>
            <div className="rounded-lg bg-blue-50 px-3 py-2 text-blue-600">🎯</div>
          </div>
          <p className="mt-3 text-3xl font-bold text-gray-900">{stats.totalSessions}</p>
          <p className="mt-1 text-xs text-gray-500">{stats.completedSessions} completed</p>
        </div>

        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-500">Average Score</p>
            <div className="rounded-lg bg-green-50 px-3 py-2 text-green-600">⭐</div>
          </div>
          <p className="mt-3 text-3xl font-bold text-gray-900">{stats.avgScore}</p>
          <p className="mt-1 text-xs text-gray-500">Across scored interviews</p>
        </div>

        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-500">Practice Time</p>
            <div className="rounded-lg bg-purple-50 px-3 py-2 text-purple-600">⏱️</div>
          </div>
          <p className="mt-3 text-3xl font-bold text-gray-900">{practiceHours}h {practiceMinutes}m</p>
          <p className="mt-1 text-xs text-gray-500">Total interview practice</p>
        </div>

        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-500">Topics Covered</p>
            <div className="rounded-lg bg-orange-50 px-3 py-2 text-orange-600">📚</div>
          </div>
          <p className="mt-3 text-3xl font-bold text-gray-900">{stats.topicsCovered.length}</p>
          <p className="mt-1 text-xs text-gray-500">Different topics practiced</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">Sessions by Mode</h2>
          <div className="mt-5 space-y-4">
            <div>
              <div className="mb-2 flex justify-between text-sm">
                <span className="font-medium text-gray-700">AI Interviews</span>
                <span className="text-gray-500">{stats.sessionsByMode.ai}</span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-gray-100">
                <div
                  className="h-full rounded-full bg-blue-500"
                  style={{
                    width: `${stats.totalSessions ? (stats.sessionsByMode.ai / stats.totalSessions) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
            <div>
              <div className="mb-2 flex justify-between text-sm">
                <span className="font-medium text-gray-700">Human Interviews</span>
                <span className="text-gray-500">{stats.sessionsByMode.human}</span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-gray-100">
                <div
                  className="h-full rounded-full bg-purple-500"
                  style={{
                    width: `${stats.totalSessions ? (stats.sessionsByMode.human / stats.totalSessions) * 100 : 0}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">Sessions by Difficulty</h2>
          <div className="mt-5 space-y-4">
            {[
              { label: "Easy", key: "easy", color: "bg-green-500" },
              { label: "Medium", key: "medium", color: "bg-yellow-500" },
              { label: "Hard", key: "hard", color: "bg-red-500" },
            ].map((item) => {
              const count = stats.sessionsByDifficulty[item.key] || 0;
              const percentage = stats.totalSessions > 0 ? (count / stats.totalSessions) * 100 : 0;
              return (
                <div key={item.key}>
                  <div className="mb-2 flex justify-between text-sm">
                    <span className="font-medium text-gray-700">{item.label}</span>
                    <span className="text-gray-500">{count}</span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className={`h-full rounded-full ${item.color}`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">Topics Covered</h2>
        {stats.topicsCovered.length === 0 ? (
          <p className="mt-4 text-sm text-gray-500">No topics practiced yet.</p>
        ) : (
          <div className="mt-4 flex flex-wrap gap-2">
            {stats.topicsCovered.map((topic) => (
              <span
                key={topic}
                className="rounded-full bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700"
              >
                {topic}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-xl border bg-white shadow-sm">
        <div className="border-b px-6 py-5">
          <h2 className="text-lg font-semibold text-gray-900">Recent Interviews</h2>
          <p className="mt-1 text-sm text-gray-500">Your latest interview practice sessions.</p>
        </div>

        {stats.recentSessions.length === 0 ? (
          <div className="p-6 text-center text-sm text-gray-500">No interviews yet.</div>
        ) : (
          <div className="divide-y">
            {stats.recentSessions.map((session, index) => (
              <div
                key={`${session.createdAt}-${index}`}
                className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-900">{session.persona}</h3>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                        session.mode === "ai" ? "bg-blue-50 text-blue-700" : "bg-purple-50 text-purple-700"
                      }`}
                    >
                      {session.mode === "ai" ? "AI" : "Human"}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {session.topics?.map((topic) => (
                      <span
                        key={topic}
                        className="rounded-md bg-gray-100 px-2 py-1 text-xs text-gray-600"
                      >
                        {topic}
                      </span>
                    ))}
                  </div>
                  <div className="mt-2 text-xs text-gray-500">
                    {session.difficulty} · {session.duration} min · {formatDate(session.createdAt)}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-xs text-gray-500">Score</p>
                    <p
                      className={`text-2xl font-bold ${
                        session.score >= 80
                          ? "text-green-600"
                          : session.score >= 60
                          ? "text-yellow-600"
                          : "text-red-600"
                      }`}
                    >
                      {session.score}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium ${
                      session.status === "completed"
                        ? "bg-green-50 text-green-700"
                        : "bg-yellow-50 text-yellow-700"
                    }`}
                  >
                    {session.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function formatDate(value) {
  if (!value) return "Unknown date";

  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return "Unknown date";
    }
    return date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "Unknown date";
  }
}
