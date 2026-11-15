import { fetchWithTimeout } from "../utils/fetchWithTimeout.js";
import { buildJob, formatSalary } from "../utils/jobMapper.js";

const HOST = "jsearch.p.rapidapi.com";

export const jsearch = {
  name: "JSearch",
  enabled: () => Boolean(process.env.JSEARCH_API_KEY),

  async search({ query, location, remoteOnly, country, page, isInternship }) {
    let q = query;
    if (location && !remoteOnly) q = `${query} in ${location}`;
    else if (remoteOnly) q = `${query} remote`;

    const params = new URLSearchParams({
      query: q,
      page: String(page),
      num_pages: "1",
      country,
      date_posted: "all",
    });
    if (isInternship) params.set("employment_types", "INTERN");
    if (remoteOnly) params.set("work_from_home", "true");

    const res = await fetchWithTimeout(`https://${HOST}/search?${params}`, {
      headers: {
        "x-rapidapi-key": process.env.JSEARCH_API_KEY,
        "x-rapidapi-host": HOST,
      },
      timeout: 15000,
    });
    if (!res.ok) throw new Error(`JSearch HTTP ${res.status}`);

    const data = await res.json();
    if (!Array.isArray(data.data)) return [];

    return data.data.map((j) =>
      buildJob({
        id: `jsearch-${j.job_id}`,
        title: j.job_title,
        company: j.employer_name,
        location: [j.job_city, j.job_state, j.job_country].filter(Boolean).join(", ") || j.job_location,
        isRemote: j.job_is_remote === true,
        stipend: formatSalary({
          min: j.job_min_salary,
          max: j.job_max_salary,
          currency: j.job_salary_currency || j.job_salary_currency_code,
          period: j.job_salary_period,
        }),
        description: j.job_description,
        type: j.job_employment_type,
        applyLink: j.job_apply_link,
        postedDate: j.job_posted_at_datetime_utc,
        deadline: j.job_offer_expiration_datetime_utc,
        skills: j.job_required_skills || [],
        badge: j.employer_logo ? "Verified" : null,
        source: "JSearch",
      })
    );
  },
};
