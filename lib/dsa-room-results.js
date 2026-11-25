// lib/dsa-room-results.js

export function formatDsaDuration(ms) {
  if (typeof ms !== "number" || Number.isNaN(ms) || ms < 0) return "—";
  const totalSeconds = Math.floor(ms / 1000);
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins}m ${secs}s`;
}

export function getRoomTimeLimitMinutes(questionCount = 2) {
  if (questionCount === 4) return 90;
  if (questionCount === 3) return 60;
  if (questionCount === 2) return 40;
  return 30;
}

export function computeDsaRoomResult({
  roomCode,
  participant,
  questions = [],
  startTime = null,
  difficulty = "Medium",
  userId,
  username,
}) {
  const questionStatuses = participant?.questionStatuses || {};
  const now = Date.now();
  const safeQuestions = Array.isArray(questions) ? questions : [];

  const questionBreakdown = safeQuestions.map((q, index) => {
    const qState = questionStatuses[q.id] || {};
    const attempts = Number(qState.attempts || 0);
    const solved = qState.status === "solved";
    const wrongAttempts = Math.max(0, attempts - (solved ? 1 : 0));
    return {
      questionId: String(q.id || `q-${index + 1}`),
      label: `Q${index + 1}`,
      title: q.title || `Question ${index + 1}`,
      solved,
      attempts,
      wrongAttempts,
      passedCount: Number(qState.passedCount || 0),
      totalCases: Number(qState.totalCases || 0),
      timeTakenMs: typeof qState.timeTaken === "number" ? qState.timeTaken : null,
    };
  });

  const totalQuestions = safeQuestions.length;
  const questionsSolved = questionBreakdown.filter((q) => q.solved).length;
  const totalAttempts = questionBreakdown.reduce((sum, q) => sum + q.attempts, 0);
  const wrongAttempts = questionBreakdown.reduce((sum, q) => sum + q.wrongAttempts, 0);
  const passedCases = questionBreakdown.reduce((sum, q) => sum + q.passedCount, 0);
  const totalCases = questionBreakdown.reduce((sum, q) => sum + q.totalCases, 0);

  const solvedTimes = questionBreakdown
    .filter((q) => q.solved && typeof q.timeTakenMs === "number")
    .map((q) => q.timeTakenMs);

  const elapsedMs = startTime ? Math.max(0, now - startTime) : 0;
  const finalTimeMs = solvedTimes.length > 0 ? Math.max(...solvedTimes) : elapsedMs;

  const limitMs = getRoomTimeLimitMinutes(totalQuestions) * 60 * 1000;
  const timeRemainingMs = Math.max(0, limitMs - finalTimeMs);

  const baseScore = totalQuestions > 0 ? (questionsSolved / totalQuestions) * 100 : 0;
  const score =
    questionsSolved === 0
      ? 0
      : Math.max(10, Math.min(100, Math.round(baseScore - wrongAttempts * 5)));

  return {
    roomCode: String(roomCode || "").toUpperCase(),
    userId: String(userId || participant?.userId || username || "guest"),
    username: String(username || participant?.username || "Anonymous"),
    difficulty,
    totalQuestions,
    questionsSolved,
    totalAttempts,
    wrongAttempts,
    passedCases,
    totalCases,
    finalTimeMs,
    timeRemainingMs,
    finishedBeforeTime: questionsSolved === totalQuestions && totalQuestions > 0 && timeRemainingMs > 0,
    score,
    questionBreakdown,
    submittedAt: new Date().toISOString(),
  };
}

export function sortDsaResults(entries = []) {
  return [...entries].sort((a, b) => {
    const scoreDiff = Number(b.score || 0) - Number(a.score || 0);
    if (scoreDiff !== 0) return scoreDiff;

    const solvedDiff = Number(b.questionsSolved || 0) - Number(a.questionsSolved || 0);
    if (solvedDiff !== 0) return solvedDiff;

    const timeA = typeof a.finalTimeMs === "number" ? a.finalTimeMs : Number.MAX_SAFE_INTEGER;
    const timeB = typeof b.finalTimeMs === "number" ? b.finalTimeMs : Number.MAX_SAFE_INTEGER;
    if (timeA !== timeB) return timeA - timeB;

    return Number(a.wrongAttempts || 0) - Number(b.wrongAttempts || 0);
  });
}
