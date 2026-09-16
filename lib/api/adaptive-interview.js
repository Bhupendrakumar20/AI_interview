import { fetchWithServiceFallback, getPrimaryServiceUrl } from "@/lib/service-urls";

export const ADAPTIVE_API_BASE = getPrimaryServiceUrl("adaptive");

export async function startAdaptiveSession({ persona, topicFocus, maxQuestions }) {
  try {
    const { response: res } = await fetchWithServiceFallback("adaptive", "/interview/start", {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        persona,
        topic_focus: topicFocus,
        max_questions: maxQuestions,
      }),
    });
    if (!res.ok) throw new Error(`Failed to start session: ${res.status}`);
    return await res.json(); // { session_id, question, difficulty, question_number }
  } catch (err) {
    if (err.message && err.message.includes('fetch')) {
      throw new Error(`Adaptive Interview server unreachable. Please start the backend service (port 8001).`);
    }
    throw err;
  }
}

export async function submitAdaptiveAnswer({ sessionId, answer }) {
  try {
    const { response: res } = await fetchWithServiceFallback("adaptive", "/interview/answer", {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: sessionId, answer }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.detail || `Failed to submit answer: ${res.status}`);
    }
    return await res.json(); // { done, evaluation, next_question?, difficulty?, topic_locked?, locked_topic?, question_number?, report? }
  } catch (err) {
    if (err.name === 'TypeError' || (err.message && err.message.includes('fetch'))) {
      throw new Error(`Adaptive Interview server unreachable. Please start the backend service (port 8001).`);
    }
    throw err;
  }
}

export async function endAdaptiveSessionEarly(sessionId) {
  try {
    const { response: res } = await fetchWithServiceFallback("adaptive", `/interview/session/${sessionId}`, {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error(`Failed to end session: ${res.status}`);
    return await res.json(); // { ended, report }
  } catch (err) {
    if (err.message && err.message.includes('fetch')) {
      throw new Error(`Adaptive Interview server unreachable. Please start the backend service (port 8001).`);
    }
    throw err;
  }
}