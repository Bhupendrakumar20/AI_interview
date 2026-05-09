import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/actions/auth.action";
import { getClientIp } from "@/lib/security/endpoint-security";
import { checkRateLimit } from "@/lib/security/rate-limiters";
import {
  createApiKey,
  getUserApiKeys,
} from "@/lib/security/api-key-management";
import { logAuditEvent } from "@/lib/security/audit-logging";

/**
 * GET /api/user/api-keys
 * List all API keys for the current user
 */
export async function GET(request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const keys = await getUserApiKeys(user.uid);

    await logAuditEvent({
      userId: user.uid,
      eventType: "api_key_list",
      severity: "info",
      description: "Listed API keys",
      resource: "api_keys",
      ip: getClientIp(request),
    });

    return NextResponse.json({
      success: true,
      keys: keys.map((key) => ({
        id: key.id,
        service: key.service,
        description: key.description,
        prefix: key.prefix,
        createdAt: key.createdAt,
        lastUsedAt: key.lastUsedAt,
        expiresAt: key.expiresAt,
        status: key.status,
      })),
    });
  } catch (error) {
    console.error("Error fetching API keys:", error);
    return NextResponse.json(
      { error: "Failed to fetch API keys" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/user/api-keys
 * Create a new API key
 */
export async function POST(request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const ip = getClientIp(request);

    // Rate limit: Max 5 key creations per hour per user
    const rateLimitKey = `api-key-create:${user.uid}`;
    const result = await checkRateLimit(rateLimitKey, 5, 60 * 60 * 1000);

    if (!result.allowed) {
      await logAuditEvent({
        userId: user.uid,
        eventType: "rate_limit_violation",
        severity: "warning",
        description: "Rate limit exceeded for API key creation",
        resource: "api_keys",
        ip,
      });

      return NextResponse.json(
        { error: "Rate limit exceeded. Max 5 keys per hour" },
        { status: 429 }
      );
    }

    const { serviceName, description } = await request.json();

    if (!serviceName || typeof serviceName !== "string") {
      return NextResponse.json(
        { error: "serviceName is required" },
        { status: 400 }
      );
    }

    if (serviceName.length > 100) {
      return NextResponse.json(
        { error: "serviceName too long (max 100 chars)" },
        { status: 400 }
      );
    }

    const key = await createApiKey(
      user.uid,
      serviceName,
      description || ""
    );

    await logAuditEvent({
      userId: user.uid,
      eventType: "api_key_created",
      severity: "info",
      description: `Created API key for service: ${serviceName}`,
      resource: "api_keys",
      ip,
      metadata: { service: serviceName },
    });

    // Return the key ONLY on creation (never again)
    return NextResponse.json(
      {
        success: true,
        message: "API key created. Store it securely - you won't see it again",
        key: key.plainKey,
        keyId: key.id,
        expiresAt: key.expiresAt,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating API key:", error);

    if (error.message.includes("Max")) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Failed to create API key" },
      { status: 500 }
    );
  }
}
