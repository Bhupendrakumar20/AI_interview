/**
 * GET /api/admin/audit-logs
 * View audit logs (admin only)
 * 
 * SECURITY:
 * - Requires admin role
 * - Can filter by user, event type, severity
 * - Returns paginated results
 */

import { NextResponse } from "next/server";
import { db } from "@/firebase/admin";
import { getCurrentUser } from "@/lib/actions/auth.action";
import {
  getCriticalAuditEvents,
  getSuspiciousActivity,
} from "@/lib/security/audit-logging";

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
    const view = url.searchParams.get("view"); // 'critical', 'suspicious', 'all'
    const eventType = url.searchParams.get("eventType");
    const severity = url.searchParams.get("severity"); // info, warning, error, critical
    const userId = url.searchParams.get("userId");
    const limit = Math.min(parseInt(url.searchParams.get("limit")) || 50, 500);
    const offset = parseInt(url.searchParams.get("offset")) || 0;

    let query = db.collection("audit_logs");

    // ✅ Build query based on parameters
    if (view === "critical") {
      return NextResponse.json(
        {
          success: true,
          view: "critical",
          events: await getCriticalAuditEvents(limit),
          timestamp: new Date().toISOString(),
        },
        { status: 200 }
      );
    }

    if (view === "suspicious") {
      return NextResponse.json(
        {
          success: true,
          view: "suspicious",
          events: await getSuspiciousActivity(limit),
          timestamp: new Date().toISOString(),
        },
        { status: 200 }
      );
    }

    // Apply filters for general query
    if (userId) {
      query = query.where("userId", "==", userId);
    }

    if (eventType) {
      query = query.where("eventType", "==", eventType);
    }

    if (severity) {
      query = query.where("severity", "==", severity);
    }

    // Order and paginate
    query = query.orderBy("timestamp", "desc").limit(limit + 1).offset(offset);

    // Get total count
    const countSnapshot = await db
      .collection("audit_logs")
      .where(
        ...(userId ? ["userId", "==", userId] : []),
        ...(eventType ? ["eventType", "==", eventType] : []),
        ...(severity ? ["severity", "==", severity] : [])
      )
      .get();

    const totalCount = countSnapshot.size;

    // Execute paginated query
    const snapshot = await query.get();

    const logs = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      logs.push({
        id: doc.id,
        ...data,
        timestamp: data.timestamp?.toDate?.() || data.timestamp,
      });
    });

    const hasMore = logs.length > limit;
    if (hasMore) {
      logs.pop(); // Remove the extra item used to check hasMore
    }

    // Get summary statistics
    const summarySnapshot = await db.collection("audit_logs").get();

    const summary = {
      total: summarySnapshot.size,
      byEventType: {},
      bySeverity: {
        info: 0,
        warning: 0,
        error: 0,
        critical: 0,
      },
    };

    summarySnapshot.forEach((doc) => {
      const data = doc.data();
      summary.byEventType[data.eventType] =
        (summary.byEventType[data.eventType] || 0) + 1;
      summary.bySeverity[data.severity] =
        (summary.bySeverity[data.severity] || 0) + 1;
    });

    return NextResponse.json(
      {
        success: true,
        logs,
        pagination: {
          total: totalCount,
          offset,
          limit,
          hasMore,
          remaining: Math.max(0, totalCount - offset - logs.length),
        },
        summary,
        filters: {
          userId: userId || "all",
          eventType: eventType || "all",
          severity: severity || "all",
        },
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[GET /api/admin/audit-logs] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to retrieve audit logs" },
      { status: 500 }
    );
  }
}
