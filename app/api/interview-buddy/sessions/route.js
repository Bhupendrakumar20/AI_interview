/**
 * GET /api/interview-buddy/sessions
 * Get user's interview buddy sessions
 */
import { NextResponse } from "next/server";
import * as admin from "firebase-admin";
import { db } from "@/firebase/admin";
import { serializeFirebaseData } from "@/lib/firebase-helpers";
import { getCurrentUser } from "@/lib/actions/auth.action";

export async function GET(request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.id === "dummy-user-id") {
      return NextResponse.json({ error: "User not authenticated" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const sessionId = searchParams.get("sessionId");

    if (!userId || userId !== currentUser.id) {
      return NextResponse.json(
        { error: userId ? "User ID mismatch" : "User ID is required" },
        { status: userId ? 403 : 400 }
      );
    }

    // Get single session if sessionId provided
    if (sessionId) {
      const query = await db.collectionGroup("interview_buddy_sessions")
        .where(admin.firestore.FieldPath.documentId(), "==", sessionId)
        .limit(1)
        .get();

      if (query.empty) {
        return NextResponse.json(
          { error: "Session not found" },
          { status: 404 }
        );
      }

      const doc = query.docs[0];

      const sessionData = doc.data();

      // Check if user has access to this session
      if (!sessionData.participants?.includes(userId) && sessionData.createdBy !== userId) {
        return NextResponse.json(
          { error: "Access denied" },
          { status: 403 }
        );
      }

      return NextResponse.json({
        id: doc.id,
        ...serializeFirebaseData(sessionData),
      });
    }

    const query = await db
      .collectionGroup("interview_buddy_sessions")
      .where("participants", "array-contains", userId)
      .orderBy("createdAt", "desc")
      .get();

    const sessions = query.docs.map((doc) => ({
      id: doc.id,
      ...serializeFirebaseData(doc.data()),
    }));

    return NextResponse.json({
      count: sessions.length,
      sessions,
    });
  } catch (error) {
    console.error("Error fetching sessions:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch sessions" },
      { status: 500 }
    );
  }
}
