"use server";

import { searchAllJobs } from "@/lib/jobs/actions.js";

export async function fetchInternshipsFromJSearch({
  query = "internship developer",
  location = "",
  page = 1,
  country,
} = {}) {
  return searchAllJobs({
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
  const query = [searchTerm, type !== "internship" && type !== "all" ? type : ""]
    .filter(Boolean)
    .join(" ");
  const searchLocation = type === "remote" ? "remote" : location;

  return searchAllJobs({
    query,
    location: searchLocation,
    type: "internship",
    page,
    country,
  });
}
