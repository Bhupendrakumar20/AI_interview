import { NextResponse } from "next/server";
import { getResumeApiAuthorizationHeader } from "@/lib/resume-api-auth";
import { fetchResumeApi } from "@/lib/resume-api-fetch";

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get("resume");

    if (!file) {
      return NextResponse.json({ error: "No resume file provided" }, { status: 400 });
    }

    const forwardData = new FormData();
    forwardData.append("resume", file);

    const response = await fetchResumeApi("/validate", {
      method: "POST",
      headers: {
        Authorization: getResumeApiAuthorizationHeader(),
        "bypass-tunnel-reminder": "true",
      },
      body: forwardData,
    });

    const responseText = await response.text();
    let data;
    try {
      data = JSON.parse(responseText);
    } catch {
      data = { error: responseText || "Resume validation service returned an invalid response." };
    }

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("Error forwarding resume validation request:", error);
    return NextResponse.json(
      { error: "Failed to validate resume", details: error.message },
      { status: 500 }
    );
  }
}
