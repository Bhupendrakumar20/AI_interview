// https://remotive.com/api/remote-jobs  - free, remote-only.
// Remotive asks you to limit requests (a few per day) and link back to the job URL,
// so we cache for 6 hours and always use their URL as the apply link.
import { fetchWithTimeout } from "../utils/fetchWithTimeout.js";
import { buildJob, stripHtml, toIsoDate, queryTokens, looksLikeInternship } from "../utils/jobMapper.js";

export const remotive = {
  name: "Remotive",
  enabled: () => true,

  async search({ query, page, limit, isInternship }) {
    if (page > 1) return []; // API has no pagination

    const search = queryTokens(query).join(" ");
    const params = new URLSearchParams({ limit: String(limit) });
    if (search) params.set("search", search);

    const res = await fetchWithTimeout(`https://remotive.com/api/remote-jobs?${params}`, {
      timeout: 12000,
      next: { revalidate: 21600 },
    });
    if (!res.ok) throw new Error(`Remotive HTTP ${res.status}`);

    const data = await res.json();
    if (!Array.isArray(data.jobs)) return [];

    return data.jobs
      .map((j) =>
        buildJob({
          id: `remotive-${j.id}`,
          title: j.title,
          company: j.company_name,
          location: j.candidate_required_location || "Remote",
          isRemote: true,
          stipend: j.salary || "Not disclosed",
          description: stripHtml(j.description),
          type: j.job_type ? String(j.job_type).replace("_", " ") : undefined,
          applyLink: j.url,
          postedDate: toIsoDate(j.publication_date),
          skills: j.tags || [],
          source: "Remotive",
        })
      )
      .filter((job) => (isInternship ? looksLikeInternship(job) : true));
  },
};
