// Indeed via HasData's scraping API (Indeed has no public job-search API).
// Check HasData's current docs for exact parameter / response field names
// (https://docs.hasdata.com) - the mapper below is deliberately defensive.
import { fetchWithTimeout } from "../utils/fetchWithTimeout.js";
import { buildJob, stripHtml, toIsoDate } from "../utils/jobMapper.js";

const DOMAINS = {
  in: "in.indeed.com",
  us: "www.indeed.com",
  gb: "uk.indeed.com",
  ca: "ca.indeed.com",
  au: "au.indeed.com",
  de: "de.indeed.com",
};

export const indeed = {
  name: "Indeed",
  enabled: () => Boolean(process.env.HASDATA_API_KEY),

  async search({ query, location, remoteOnly, country, page }) {
    // Pagination on HasData differs per plan/endpoint; only page 1 is fetched to be safe.
    if (page > 1) return [];

    const params = new URLSearchParams({
      keyword: remoteOnly ? `${query} remote` : query,
      location: remoteOnly ? "" : location || "",
      domain: DOMAINS[country] || DOMAINS.us,
    });

    const res = await fetchWithTimeout(`https://api.hasdata.com/scrape/indeed/listing?${params}`, {
      headers: { "x-api-key": process.env.HASDATA_API_KEY },
      timeout: 20000,
    });
    if (!res.ok) throw new Error(`HasData/Indeed HTTP ${res.status}`);

    const data = await res.json();
    const list = data.jobs || data.results || data.data || [];
    if (!Array.isArray(list)) return [];

    return list.map((j) => {
      const link = j.url || j.link || j.applyLink || "";
      const loc = typeof j.location === "string" ? j.location : j.location?.formatted || j.location?.city || "";
      const salary = typeof j.salary === "string" ? j.salary : j.salary?.text || j.salary?.formatted;
      return buildJob({
        id: `indeed-${j.jobKey || j.id || link}`,
        title: j.title || j.jobTitle,
        company: typeof j.company === "string" ? j.company : j.company?.name || j.companyName,
        location: loc,
        isRemote: /remote/i.test(`${loc} ${j.title || ""}`),
        stipend: salary || "Not disclosed",
        description: stripHtml(j.description || j.descriptionHtml || j.snippet || ""),
        type: j.jobType || (Array.isArray(j.jobTypes) ? j.jobTypes.join(", ") : undefined),
        applyLink: link,
        postedDate: toIsoDate(j.postedAt || j.datePosted || j.date),
        source: "Indeed",
      });
    });
  },
};
