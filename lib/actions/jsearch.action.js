"use server";

import { aggregateJobs } from "@/lib/jobs/services/jobAggregator.js";

export async function fetchInternshipsFromJSearch({
  query = "internship developer",
  location = "",
  page = 1,
  country,
} = {}) {
  return aggregateJobs({
    query,
    location,
    page,
    country,
    type: "internship",
  });
}

export async function searchInternshipsJSearch({
  searchTerm = "internship",
  location = "all",
  type = "internship",
  page = 1,
  country,
} = {}) {
  const query = [searchTerm, type !== "internship" && type !== "all" && type !== "remote" ? type : ""]
    .filter(Boolean)
    .join(" ");

  return aggregateJobs({
    query,
    location: type === "remote" ? "remote" : location,
    type: "internship",
    page,
    country,
  });
}
