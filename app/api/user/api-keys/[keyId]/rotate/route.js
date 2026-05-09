import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/actions/auth.action";
import { getClientIp } from "@/lib/security/endpoint-security";
import { rotateApiKey } from "@/lib/security/api-key-management";
import { logAuditEvent } from "@/lib/security/audit-logging";
import { db } from "@/firebase";
import { doc, getDoc } from "firebase/firestore";

/**
 * POST /api/user/api-keys/[keyId]/rotate
 * Rotate an API key (create new, revoke old)
 */
export async function POST(request, { params }) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { keyId } = params;

    if (!keyId) {
      return NextResponse.json({ error: "keyId is required" }, { status: 400 });
    }

    // Get the old key to retrieve service name
    const keyDocRef = doc(db, "users", user.uid, "api_keys", keyId);
    const keyDocSnap = await getDoc(keyDocRef);

    if (!keyDocSnap.exists()) {
      return NextResponse.json({ error: "API key not found" }, { status: 404 });
    }

    const oldKeyData = keyDocSnap.data();

    // Rotate the key
    const result = await rotateApiKey(user.uid, keyId, oldKeyData.service);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to rotate key" },
        { status: 400 }
      );
    }

    await logAuditEvent({
      userId: user.uid,
      eventType: "api_key_rotated",
      severity: "info",
      description: `Rotated API key: ${keyId}`,
      resource: "api_keys",
      ip: getClientIp(request),
      metadata: { keyId, oldKeyId: keyId, newKeyId: result.newKeyId },
    });

    return NextResponse.json(
      {
        success: true,
        message: "API key rotated. Store new key securely.",
        newKey: result.newKeyPlainKey,
        newKeyId: result.newKeyId,
        oldKeyId: keyId,
        expiresAt: result.expiresAt,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error rotating API key:", error);
    return NextResponse.json(
      { error: "Failed to rotate API key" },
      { status: 500 }
    );
  }
}
