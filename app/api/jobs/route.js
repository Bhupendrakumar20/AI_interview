import { NextResponse } from "next/server";
import { fetchJobs } from "@/lib/actions/jobs.action";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("query") || "developer jobs";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const country = searchParams.get("country") || "us";
    const datePosted = searchParams.get("date_posted") || "all";
    const useFallback = searchParams.get("fallback") !== "false";

    const result = await fetchJobs(query, {
      page,
      country,
      date_posted: datePosted,
      useFallback,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("API Jobs Route Error:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
