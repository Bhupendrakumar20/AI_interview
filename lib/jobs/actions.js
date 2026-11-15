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
