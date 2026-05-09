/**
 * GET /api/admin/proctoring/reviews
 * List all flagged proctoring reviews
 * Admin-only endpoint
 * 
 * SECURITY:
 * - Requires admin role
 * - Can filter by status, severity
 * - Returns aggregated violation data
 */

import { NextResponse } from "next/server";
import { db } from "@/firebase/admin";
import { getCurrentUser } from "@/lib/actions/auth.action";

/**
 * Check if user is admin
 */
async function isAdmin(userId) {
  try {
    const userRef = db.collection("users").doc(userId);
    const userDoc = await userRef.get();
    const userData = userDoc.data();
    return userData?.role === "admin" || userData?.isAdmin === true;
  } catch {
    return false;
  }
}

export async function GET(request) {
  try {
    // ✅ Verify user authentication
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json(
        { error: "User not authenticated" },
        { status: 401 }
      );
    }

    // ✅ Verify admin role
    const userIsAdmin = await isAdmin(currentUser.uid);
    if (!userIsAdmin) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    // Parse query parameters
    const url = new URL(request.url);
    const status = url.searchParams.get("status"); // pending, reviewed, resolved
    const severity = url.searchParams.get("severity"); // HIGH, CRITICAL
    const limit = parseInt(url.searchParams.get("limit")) || 50;
    const offset = parseInt(url.searchParams.get("offset")) || 0;

    // Build query
    let query = db.collection("proctoring_reviews").orderBy("createdAt", "desc");

    if (status) {
      query = query.where("status", "==", status);
    }

    if (severity) {
      query = query.where("severity", "==", severity);
    }

    // Get total count
    const countSnapshot = await query.get();
    const totalCount = countSnapshot.size;

    // Apply pagination
    const snapshot = await query.limit(limit + 1).offset(offset).get();

    const reviews = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      reviews.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.() || data.createdAt,
      });
    });

    const hasMore = reviews.length > limit;
    if (hasMore) {
      reviews.pop(); // Remove the extra item used to check hasMore
    }

    // ✅ Get summary statistics
    const summarySnapshot = await db.collection("proctoring_reviews").get();

    const summary = {
      total: summarySnapshot.size,
      pending: 0,
      reviewed: 0,
      resolved: 0,
      critical: 0,
      high: 0,
      medium: 0,
    };

    summarySnapshot.forEach((doc) => {
      const data = doc.data();
      if (data.status === "pending") summary.pending++;
      else if (data.status === "reviewed") summary.reviewed++;
      else if (data.status === "resolved") summary.resolved++;

      if (data.severity === "CRITICAL") summary.critical++;
      else if (data.severity === "HIGH") summary.high++;
      else if (data.severity === "MEDIUM") summary.medium++;
    });

    return NextResponse.json(
      {
        success: true,
        reviews,
        pagination: {
          total: totalCount,
          offset,
          limit,
          hasMore,
          remaining: Math.max(0, totalCount - offset - reviews.length),
        },
        summary,
        filters: {
          status: status || "all",
          severity: severity || "all",
        },
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[GET /api/admin/proctoring/reviews] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to retrieve proctoring reviews" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/proctoring/reviews
 * Update review status
 */
export async function PUT(request) {
  try {
    // ✅ Verify user authentication
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json(
        { error: "User not authenticated" },
        { status: 401 }
      );
    }

    // ✅ Verify admin role
    const userIsAdmin = await isAdmin(currentUser.uid);
    if (!userIsAdmin) {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { reviewId, status, resolution, notes } = body;

    if (!reviewId || !status) {
      return NextResponse.json(
        { error: "reviewId and status are required" },
        { status: 400 }
      );
    }

    const validStatuses = ["pending", "reviewed", "resolved"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` },
        { status: 400 }
      );
    }

    // Update review
    const reviewRef = db.collection("proctoring_reviews").doc(reviewId);
    const reviewDoc = await reviewRef.get();

    if (!reviewDoc.exists) {
      return NextResponse.json(
        { error: "Review not found" },
        { status: 404 }
      );
    }

    await reviewRef.update({
      status,
      resolution: resolution || null,
      notes: notes || null,
      reviewedBy: currentUser.uid,
      reviewedAt: new Date(),
    });

    return NextResponse.json(
      {
        success: true,
        reviewId,
        status,
        message: "Review updated successfully",
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[PUT /api/admin/proctoring/reviews] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update review" },
      { status: 500 }
    );
  }
}
