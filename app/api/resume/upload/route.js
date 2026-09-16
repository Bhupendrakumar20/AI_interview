import { NextResponse } from "next/server";
import { fetchWithServiceFallback } from "@/lib/service-urls";

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get("resume");

    if (!file) {
      return NextResponse.json({ error: "No resume file provided" }, { status: 400 });
    }

    const { response } = await fetchWithServiceFallback(
      "resume",
      "/parse",
      () => {
        const forwardData = new FormData();
        forwardData.append("resume", file);
        return {
          method: "POST",
          body: forwardData,
        };
      },
      request
    );

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: "FastAPI server error", details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error forwarding parse request:", error);
    return NextResponse.json(
      { error: "Failed to parse resume", details: error.message },
      { status: 500 }
    );
  }
}
