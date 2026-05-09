/**
 * GET /api/user/audit-logs
 * Get audit logs for current user
 * 
 * SECURITY:
 * - Only returns logs for authenticated user
 * - Limited to last 90 days by default
 * - Can be used for security review
 */

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/actions/auth.action";
import { getUserAuditLogs, getAuditSummary } from "@/lib/security/audit-logging";

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

    // Parse query parameters
    const url = new URL(request.url);
    const limit = Math.min(parseInt(url.searchParams.get("limit")) || 50, 100);
    const offset = parseInt(url.searchParams.get("offset")) || 0;
    const summary = url.searchParams.get("summary") === "true";

    // ✅ Get user's audit logs (only their own)
    const logs = await getUserAuditLogs(currentUser.uid, limit, offset);

    // Get summary if requested
    let auditSummary = null;
    if (summary) {
      auditSummary = await getAuditSummary(currentUser.uid, 90);
    }

    return NextResponse.json(
      {
        success: true,
        userId: currentUser.uid,
        logs: logs.logs,
        pagination: {
          limit,
          offset,
          hasMore: logs.hasMore,
          total: logs.total,
        },
        ...(auditSummary && { summary: auditSummary }),
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[GET /api/user/audit-logs] Error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to retrieve audit logs" },
      { status: 500 }
    );
  }
}
