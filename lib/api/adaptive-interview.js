export const ADAPTIVE_API_BASE = process.env.NEXT_PUBLIC_ADAPTIVE_API_URL || 'http://localhost:8001';

export async function startAdaptiveSession({ persona, topicFocus, maxQuestions }) {
  const res = await fetch(`${ADAPTIVE_API_BASE}/interview/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      persona,
      topic_focus: topicFocus,
      max_questions: maxQuestions,
    }),
  });
  if (!res.ok) throw new Error(`Failed to start session: ${res.status}`);
  return res.json(); // { session_id, question, difficulty, question_number }
}

export async function submitAdaptiveAnswer({ sessionId, answer }) {
  const res = await fetch(`${ADAPTIVE_API_BASE}/interview/answer`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ session_id: sessionId, answer }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `Failed to submit answer: ${res.status}`);
  }
  return res.json(); // { done, evaluation, next_question?, difficulty?, topic_locked?, locked_topic?, question_number?, report? }
}

export async function endAdaptiveSessionEarly(sessionId) {
  const res = await fetch(`${ADAPTIVE_API_BASE}/interview/session/${sessionId}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(`Failed to end session: ${res.status}`);
  return res.json(); // { ended, report }
}