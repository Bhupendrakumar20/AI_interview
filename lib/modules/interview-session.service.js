import { randomUUID } from "node:crypto";
import { db } from "@/firebase/admin";
import { serializeFirebaseData } from "@/lib/firebase-helpers";

export const INTERVIEW_MODES = [
  "mock-interview",
  "mock-test",
  "ai-buddy-mode",
  "resume-round",
];

const MOCK_TEST_ROUNDS = {
  technical: "technical",
  "technical round": "technical",
  behavioral: "behavioral",
  "behavioral round": "behavioral",
  "system design": "system-design",
  "coding challenge": "coding",
  coding: "coding",
};
const MOCK_TEST_QUESTION_LOAD_TTL_MS = 30 * 60 * 1000;

function getMockTestRound(details = {}) {
  const round = details.roundId || details.roundName || details.type;
  if (typeof round !== "string") return null;

  const normalizedRound = round.trim().toLowerCase().replace(/[_-]+/g, " ");
  return MOCK_TEST_ROUNDS[normalizedRound] || normalizedRound;
}

function getUnexpiredQuestionLoads(control, now = Date.now()) {
  return (Array.isArray(control.mockTestQuestionLoads) ? control.mockTestQuestionLoads : [])
    .filter((load) =>
      load &&
      typeof load.requestId === "string" &&
      typeof load.roundId === "string" &&
      Number.isFinite(load.expiresAt) &&
      load.expiresAt > now
    );
}

async function getActiveMockTestRounds(transaction, userRef, activeSessionIds) {
  if (!activeSessionIds.length) return [];

  const activeSessionDocs = await transaction.getAll(
    ...activeSessionIds.map((activeSessionId) =>
      userRef.collection("interview_sessions").doc(activeSessionId)
    )
  );
  return activeSessionDocs
    .filter((sessionDoc) => {
      if (!sessionDoc.exists) return false;
      const session = sessionDoc.data();
      return session.status === "active" && session.mode === "mock-test";
    })
    .map((sessionDoc) => getMockTestRound(sessionDoc.data().details));
}

function throwForConflictingRound(rounds, requestedRound) {
  const conflictingRound = rounds.find((round) => round !== requestedRound);
  if (conflictingRound !== undefined) {
    throw new ActiveInterviewRoundError(conflictingRound || "another");
  }
}

export class ActiveInterviewModeError extends Error {
  constructor(activeMode) {
    super(`You already have an active ${activeMode} session. End it before starting another mode.`);
    this.name = "ActiveInterviewModeError";
    this.activeMode = activeMode;
  }
}

export class ActiveInterviewRoundError extends Error {
  constructor(activeRound) {
    const roundLabel = {
      technical: "Technical Round",
      behavioral: "Behavioral Round",
      "system-design": "System Design",
      coding: "Coding Challenge",
    }[activeRound] || activeRound;

    super(`You already have an active ${roundLabel} mock-test round. End it before starting a different round.`);
    this.name = "ActiveInterviewRoundError";
    this.activeRound = activeRound;
  }
}

export async function startInterviewModeSession({
  userId,
  mode,
  sessionId = randomUUID(),
  resourceId = null,
  details = {},
}) {
  if (!userId) throw new Error("User ID is required");
  if (!INTERVIEW_MODES.includes(mode)) throw new Error("Invalid interview mode");
  if (!sessionId) throw new Error("Session ID is required");
  if (mode === "mock-test" && !getMockTestRound(details)) {
    throw new Error("Mock-test round is required");
  }

  const userRef = db.collection("users").doc(userId);
  const controlRef = userRef.collection("interview_control").doc("active");
  const sessionRef = userRef.collection("interview_sessions").doc(sessionId);

  await db.runTransaction(async (transaction) => {
    const controlDoc = await transaction.get(controlRef);
    const sessionDoc = await transaction.get(sessionRef);

    if (sessionDoc.exists) {
      throw new Error("Interview session already exists");
    }

    const control = controlDoc.exists ? controlDoc.data() : {};
    const activeMode = control.activeMode || null;
    if (activeMode && activeMode !== mode) {
      throw new ActiveInterviewModeError(activeMode);
    }

    const activeSessionIds = Array.isArray(control.activeSessionIds)
      ? control.activeSessionIds
      : [];
    const activeQuestionLoads = getUnexpiredQuestionLoads(control);

    if (activeQuestionLoads.length && mode !== "mock-test") {
      throw new ActiveInterviewModeError("mock-test");
    }

    if (mode === "mock-test") {
      const requestedRound = getMockTestRound(details);
      const activeRounds = activeMode === "mock-test"
        ? await getActiveMockTestRounds(transaction, userRef, activeSessionIds)
        : [];
      throwForConflictingRound(
        [...activeRounds, ...activeQuestionLoads.map((load) => load.roundId)],
        requestedRound
      );
    }

    transaction.set(controlRef, {
      activeMode: mode,
      activeSessionIds: [...activeSessionIds, sessionId],
      updatedAt: new Date().toISOString(),
    }, { merge: true });
    transaction.create(sessionRef, {
      userId,
      sessionId,
      mode,
      resourceId,
      details: details || {},
      status: "active",
      result: null,
      createdAt: new Date().toISOString(),
      completedAt: null,
    });
  });

  return { sessionId, mode };
}

export async function acquireMockTestQuestionLoad({ userId, roundId, requestId }) {
  if (!userId) throw new Error("User ID is required");
  if (!requestId) throw new Error("Question load request ID is required");

  const requestedRound = getMockTestRound({ roundId });
  if (!requestedRound) throw new Error("Mock-test round is required");

  const userRef = db.collection("users").doc(userId);
  const controlRef = userRef.collection("interview_control").doc("active");

  await db.runTransaction(async (transaction) => {
    const controlDoc = await transaction.get(controlRef);
    const control = controlDoc.exists ? controlDoc.data() : {};
    const activeMode = control.activeMode || null;
    if (activeMode && activeMode !== "mock-test") {
      throw new ActiveInterviewModeError(activeMode);
    }

    const activeSessionIds = Array.isArray(control.activeSessionIds)
      ? control.activeSessionIds
      : [];
    const activeRounds = await getActiveMockTestRounds(
      transaction,
      userRef,
      activeSessionIds
    );
    const activeQuestionLoads = getUnexpiredQuestionLoads(control);
    throwForConflictingRound(
      [...activeRounds, ...activeQuestionLoads.map((load) => load.roundId)],
      requestedRound
    );

    transaction.set(controlRef, {
      mockTestQuestionLoads: [
        ...activeQuestionLoads,
        {
          requestId,
          roundId: requestedRound,
          expiresAt: Date.now() + MOCK_TEST_QUESTION_LOAD_TTL_MS,
        },
      ],
      updatedAt: new Date().toISOString(),
    }, { merge: true });
  });
}

export async function releaseMockTestQuestionLoad({ userId, requestId }) {
  if (!userId || !requestId) return;

  const controlRef = db
    .collection("users")
    .doc(userId)
    .collection("interview_control")
    .doc("active");

  await db.runTransaction(async (transaction) => {
    const controlDoc = await transaction.get(controlRef);
    if (!controlDoc.exists) return;

    const control = controlDoc.data();
    const questionLoads = getUnexpiredQuestionLoads(control)
      .filter((load) => load.requestId !== requestId);
    transaction.set(controlRef, {
      mockTestQuestionLoads: questionLoads,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
  });
}

export async function finishInterviewModeSession({
  userId,
  sessionId,
  status = "completed",
  result = null,
}) {
  if (!userId) throw new Error("User ID is required");
  if (!sessionId) throw new Error("Session ID is required");
  if (!["completed", "abandoned"].includes(status)) {
    throw new Error("Invalid interview session status");
  }

  const userRef = db.collection("users").doc(userId);
  const controlRef = userRef.collection("interview_control").doc("active");
  const sessionRef = userRef.collection("interview_sessions").doc(sessionId);

  return db.runTransaction(async (transaction) => {
    const sessionDoc = await transaction.get(sessionRef);
    if (!sessionDoc.exists) throw new Error("Interview session not found");

    const session = sessionDoc.data();
    if (session.status !== "active") {
      return serializeFirebaseData(session);
    }

    const controlDoc = await transaction.get(controlRef);
    const resourceRef = session.resourceId ? db.doc(session.resourceId) : null;
    const resourceDoc = resourceRef ? await transaction.get(resourceRef) : null;
    const control = controlDoc.exists ? controlDoc.data() : {};
    const activeSessionIds = (Array.isArray(control.activeSessionIds)
      ? control.activeSessionIds
      : []).filter((id) => id !== sessionId);

    transaction.update(sessionRef, {
      status,
      result,
      completedAt: new Date().toISOString(),
    });

    transaction.set(controlRef, {
      activeMode: activeSessionIds.length ? session.mode : null,
      activeSessionIds,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
    if (resourceDoc?.exists) {
      const resourceUpdates = {
        status,
        updatedAt: new Date().toISOString(),
      };
      if (resourceRef.path.includes("/interview_buddy_sessions/")) {
        resourceUpdates.endTime = new Date();
      }
      transaction.update(resourceRef, resourceUpdates);
    }

    return {
      ...session,
      status,
      result,
      completedAt: new Date().toISOString(),
    };
  });
}

export async function getInterviewModeSessions({ userId, mode, limit = 20 }) {
  if (!userId) throw new Error("User ID is required");

  let query = db.collection("users").doc(userId).collection("interview_sessions");
  if (mode) {
    if (!INTERVIEW_MODES.includes(mode)) throw new Error("Invalid interview mode");
    query = query.where("mode", "==", mode);
  }

  const snapshot = await query.get();
  return snapshot.docs
    .map((doc) => serializeFirebaseData({ id: doc.id, ...doc.data() }))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit);
}

export async function getActiveInterviewModeSessions(userId) {
  if (!userId) throw new Error("User ID is required");

  const userRef = db.collection("users").doc(userId);
  const controlDoc = await userRef.collection("interview_control").doc("active").get();
  const sessionIds = controlDoc.exists && Array.isArray(controlDoc.data().activeSessionIds)
    ? controlDoc.data().activeSessionIds
    : [];
  if (!sessionIds.length) return [];

  const sessionRefs = sessionIds.map((sessionId) =>
    userRef.collection("interview_sessions").doc(sessionId)
  );
  const sessionDocs = await db.getAll(...sessionRefs);
  return sessionDocs
    .filter((doc) => doc.exists)
    .map((doc) => serializeFirebaseData({ id: doc.id, ...doc.data() }))
    .filter((session) => session.status === "active");
}

export async function getInterviewModeSession({ userId, sessionId }) {
  if (!userId) throw new Error("User ID is required");
  if (!sessionId) throw new Error("Session ID is required");

  const sessionDoc = await db
    .collection("users")
    .doc(userId)
    .collection("interview_sessions")
    .doc(sessionId)
    .get();
  return sessionDoc.exists
    ? serializeFirebaseData({ id: sessionDoc.id, ...sessionDoc.data() })
    : null;
}
