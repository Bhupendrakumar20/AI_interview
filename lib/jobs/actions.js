"use server";
// NOTE: a "use server" file may only export async functions, so keep helpers in other files.
import { aggregateJobs } from "./services/jobAggregator.js";

/**
 * New main entry point.
 * @param {{query?:string, location?:string, type?:string, country?:string, page?:number, limit?:number}} params
 */
export async function searchAllJobs(params = {}) {
  return aggregateJobs(params);
}

/**
 * Backwards-compatible wrapper: your existing frontend can keep calling this unchanged.
 * Returns { success, internships, totalResults, source, providers, ... }.
 */
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

  return aggregateJobs({ query, location: searchLocation, type: "internship", page, country });
}
