// https://developer.adzuna.com  - free tier, supports India ("in").
import { fetchWithTimeout } from "../utils/fetchWithTimeout.js";
import { buildJob, formatSalary } from "../utils/jobMapper.js";

const SUPPORTED = new Set(["gb", "us", "au", "ca", "de", "fr", "in", "it", "nl", "nz", "pl", "sg", "za", "br", "at", "ch", "mx", "es"]);

export const adzuna = {
  name: "Adzuna",
  enabled: () => Boolean(process.env.ADZUNA_APP_ID && process.env.ADZUNA_APP_KEY),

  async search({ query, location, remoteOnly, country, page, limit }) {
    const cc = SUPPORTED.has(country) ? country : "in";
    const params = new URLSearchParams({
      app_id: process.env.ADZUNA_APP_ID,
      app_key: process.env.ADZUNA_APP_KEY,
      results_per_page: String(Math.min(limit, 50)),
      what: remoteOnly ? `${query} remote` : query,
      sort_by: "date",
      "content-type": "application/json",
    });
    if (location && !remoteOnly) params.set("where", location);

    const res = await fetchWithTimeout(`https://api.adzuna.com/v1/api/jobs/${cc}/search/${page}?${params}`, {
      timeout: 12000,
    });
    if (!res.ok) throw new Error(`Adzuna HTTP ${res.status}`);

    const data = await res.json();
    if (!Array.isArray(data.results)) return [];

    return data.results.map((j) =>
      buildJob({
        id: `adzuna-${j.id}`,
        title: j.title,
        company: j.company?.display_name,
        location: j.location?.display_name,
        isRemote: /remote/i.test(`${j.title} ${j.location?.display_name || ""}`),
        stipend: formatSalary({
          min: j.salary_min,
          max: j.salary_max,
          currency: cc === "in" ? "INR" : cc === "us" ? "USD" : cc === "gb" ? "GBP" : "",
          period: "year",
        }),
        description: j.description,
        type: [j.contract_time, j.contract_type].filter(Boolean).join(", ") || undefined,
        applyLink: j.redirect_url,
        postedDate: j.created,
        skills: j.category?.label ? [j.category.label] : [],
        source: "Adzuna",
      })
    );
  },
};
