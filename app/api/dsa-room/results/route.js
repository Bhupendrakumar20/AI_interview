// app/api/dsa-room/results/route.js

import { NextResponse } from "next/server";
import { db } from "@/firebase/admin";
import { serializeFirebaseData } from "@/lib/firebase-helpers";
import { sortDsaResults } from "@/lib/dsa-room-results";

function normalizeRoomCode(raw) {
  return String(raw || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, "");
}

function makeEntryKey(userId, username) {
  const base = String(userId || username || "guest")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "_");
  return (base || "guest").slice(0, 120);
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const roomCode = normalizeRoomCode(searchParams.get("roomCode"));

    if (roomCode.length < 2 || roomCode.length > 20) {
      return NextResponse.json(
        { success: false, error: "Valid room code is required." },
        { status: 400 }
      );
    }

    const roomRef = db.collection("dsa_room_results").doc(roomCode);
    const [roomSnap, entriesSnap] = await Promise.all([
      roomRef.get(),
      roomRef.collection("entries").get(),
    ]);

    const entries = entriesSnap.docs.map((doc) =>
      serializeFirebaseData({ id: doc.id, ...doc.data() })
    );

    return NextResponse.json({
      success: true,
      roomCode,
      roomMeta: roomSnap.exists ? serializeFirebaseData(roomSnap.data()) : null,
      results: sortDsaResults(entries),
    });
  } catch (error) {
    console.error("[DSA Results GET] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to load room test results." },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const roomCode = normalizeRoomCode(body?.roomCode);

    if (roomCode.length < 2 || roomCode.length > 20) {
      return NextResponse.json(
        { success: false, error: "Valid room code is required." },
        { status: 400 }
      );
    }

    const username = String(body?.username || "Anonymous").trim().slice(0, 100);
    const userId = String(body?.userId || username || "guest").trim().slice(0, 120);
    const entryKey = makeEntryKey(userId, username);

    const entry = {
      roomCode,
      userId,
      username,
      difficulty: String(body?.difficulty || "Medium").slice(0, 30),
      totalQuestions: Math.max(0, Number(body?.totalQuestions || 0)),
      questionsSolved: Math.max(0, Number(body?.questionsSolved || 0)),
      totalAttempts: Math.max(0, Number(body?.totalAttempts || 0)),
      wrongAttempts: Math.max(0, Number(body?.wrongAttempts || 0)),
      passedCases: Math.max(0, Number(body?.passedCases || 0)),
      totalCases: Math.max(0, Number(body?.totalCases || 0)),
      finalTimeMs: Math.max(0, Number(body?.finalTimeMs || 0)),
      timeRemainingMs: Math.max(0, Number(body?.timeRemainingMs || 0)),
      finishedBeforeTime: Boolean(body?.finishedBeforeTime),
      score: Math.max(0, Math.min(100, Math.round(Number(body?.score || 0)))),
      questionBreakdown: Array.isArray(body?.questionBreakdown)
        ? body.questionBreakdown.slice(0, 20)
        : [],
      submittedAt: new Date().toISOString(),
    };

    const roomRef = db.collection("dsa_room_results").doc(roomCode);
    await roomRef.set(
      {
        roomCode,
        difficulty: entry.difficulty,
        totalQuestions: entry.totalQuestions,
        updatedAt: entry.submittedAt,
      },
      { merge: true }
    );

    await roomRef.collection("entries").doc(entryKey).set(entry, { merge: true });

    const entriesSnap = await roomRef.collection("entries").get();
    const results = sortDsaResults(
      entriesSnap.docs.map((doc) => serializeFirebaseData({ id: doc.id, ...doc.data() }))
    );

    return NextResponse.json({
      success: true,
      roomCode,
      entry,
      results,
    });
  } catch (error) {
    console.error("[DSA Results POST] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to save room test result." },
      { status: 500 }
    );
  }
}
