/**
 * GET /api/auth/current-user
 * Get the currently authenticated user
 * Used by client-side pages to check authentication
 */
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/actions/auth.action";

export async function GET(request) {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    return NextResponse.json(user, { status: 200 });
  } catch (error) {
    console.error("[current-user] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to get current user" },
      { status: 500 }
    );
  }
}
