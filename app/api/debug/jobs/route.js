import { NextResponse } from "next/server";
import { fetchJobs } from "@/lib/actions/jobs.action";
import { searchInternshipsJSearch } from "@/lib/actions/jsearch.action";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") || "jobs"; // "jobs" or "internships"

  try {
    if (type === "internships") {
      const result = await searchInternshipsJSearch({
        searchTerm: "developer",
        location: "remote"
      });
      return NextResponse.json(result);
    } else {
      const result = await fetchJobs("developer jobs", {
        useFallback: true
      });
      return NextResponse.json(result);
    }
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
