const DEFAULT_DISCOVERY_API_URL = "http://127.0.0.1:8002";

function getDiscoveryApiUrl() {
  return (process.env.HACKATHON_DISCOVERY_API_URL || DEFAULT_DISCOVERY_API_URL).replace(/\/+$/, "");
}

export async function POST() {
  try {
    const response = await fetch(`${getDiscoveryApiUrl()}/api/competitions/sync`, {
      method: "POST",
      cache: "no-store",
    });
    const body = await response.text();
    return new Response(body, {
      status: response.status,
      headers: { "Content-Type": response.headers.get("content-type") || "application/json" },
    });
  } catch (error) {
    console.error("Could not refresh competition listings:", error);
    return Response.json(
      { error: "Competition discovery service is unavailable. Start the FastAPI service and try again." },
      { status: 503 }
    );
  }
}
