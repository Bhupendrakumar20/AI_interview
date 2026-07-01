import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/actions/auth.action";

export async function GET(request) {
  try {
    // Verify user authentication
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const apiKey = process.env.METERED_API_KEY;
    const appName = process.env.METERED_APP_NAME;

    // Default fallback to public STUN servers if metered credentials are not set
    const defaultIceServers = [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
      { urls: "stun:stun2.l.google.com:19302" }
    ];

    if (!apiKey || !appName) {
      console.warn("⚠️ Metered.ca credentials not set. Falling back to public Google STUN servers.");
      return NextResponse.json({ iceServers: defaultIceServers });
    }

    console.log(`🔌 Fetching ephemeral ICE credentials from Metered.ca for app: ${appName}...`);
    const response = await fetch(`https://${appName}.metered.ca/api/v1/turn/credentials?apiKey=${apiKey}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" }
    });

    if (!response.ok) {
      throw new Error(`Metered API responded with status ${response.status}`);
    }

    const iceServers = await response.json();
    return NextResponse.json({ iceServers });
  } catch (error) {
    console.error("Error fetching ICE credentials:", error);
    // Return graceful fallback so mock interview room never breaks
    return NextResponse.json({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" }
      ]
    });
  }
}
