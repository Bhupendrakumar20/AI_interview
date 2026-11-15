// https://www.arbeitnow.com/api/job-board-api  - free, no key, mostly Europe (Germany).
// No search parameter, so we fetch a page and filter locally.
import { fetchWithTimeout } from "../utils/fetchWithTimeout.js";
import { buildJob, stripHtml, toIsoDate, matchesQuery, looksLikeInternship } from "../utils/jobMapper.js";

export const arbeitnow = {
  name: "Arbeitnow",
  enabled: () => true,

  async search({ query, location, remoteOnly, page, isInternship }) {
    const res = await fetchWithTimeout(`https://www.arbeitnow.com/api/job-board-api?page=${page}`, {
      timeout: 12000,
      next: { revalidate: 3600 }, // Next.js caches this response for 1h
    });
    if (!res.ok) throw new Error(`Arbeitnow HTTP ${res.status}`);

    const data = await res.json();
    if (!Array.isArray(data.data)) return [];

    return data.data
      .map((j) =>
        buildJob({
          id: `arbeitnow-${j.slug}`,
          title: j.title,
          company: j.company_name,
          location: j.location,
          isRemote: j.remote === true,
          description: stripHtml(j.description),
          type: Array.isArray(j.job_types) ? j.job_types.join(", ") : undefined,
          applyLink: j.url,
          postedDate: toIsoDate(j.created_at),
          skills: j.tags || [],
          source: "Arbeitnow",
        })
      )
      .filter((job) => matchesQuery(job, query))
      .filter((job) => (isInternship ? looksLikeInternship(job) : true))
      .filter((job) => (remoteOnly ? job.isRemote : true))
      .filter((job) => !location || remoteOnly || job.location.toLowerCase().includes(location.toLowerCase()));
  },
};
