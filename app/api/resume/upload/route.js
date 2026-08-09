import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get("resume");

    if (!file) {
      return NextResponse.json({ error: "No resume file provided" }, { status: 400 });
    }

    const forwardData = new FormData();
    forwardData.append("resume", file);

    const pythonUrl = process.env.NEXT_PUBLIC_RESUME_API_URL || process.env.NEXT_PUBLIC_RESUME_API_URL_2 || "http://127.0.0.1:8000";
    const response = await fetch(`${pythonUrl}/parse`, {
      method: "POST",
      headers: {
        "bypass-tunnel-reminder": "true",
      },
      body: forwardData,
    });

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
