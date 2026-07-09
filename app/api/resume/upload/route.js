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

    const response = await fetch("http://localhost:8080/parse", {
      method: "POST",
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
