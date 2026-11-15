import { jsearch } from "../providers/jsearch.js";
import { indeed } from "../providers/indeed.js";
import { adzuna } from "../providers/adzuna.js";
import { arbeitnow } from "../providers/arbeitnow.js";
import { remotive } from "../providers/remotive.js";
import { deduplicateJobs } from "../utils/deduplicateJobs.js";
import { getCached, setCached } from "../utils/cache.js";

// Order = priority (used only for display order of provider statuses)
const PROVIDERS = [jsearch, indeed, adzuna, arbeitnow, remotive];
const CACHE_TTL_MS = 10 * 60 * 1000;

function normalizeParams(raw = {}) {
  const type = (raw.type || "internship").toLowerCase();
  let query = (raw.query || raw.searchTerm || "").trim() || "developer";
  const isInternship = type === "internship";
  if (isInternship && !/intern/i.test(query)) query = `${query} intern`;

  const loc = (raw.location || "").trim();
  const remoteOnly = loc.toLowerCase() === "remote";

  return {
    query,
    location: loc.toLowerCase() === "all" || remoteOnly ? "" : loc,
    remoteOnly,
    isInternship,
    country: (raw.country || process.env.DEFAULT_JOB_COUNTRY || "in").toLowerCase(),
    page: Math.max(1, Number(raw.page) || 1),
    limit: Math.min(50, Math.max(5, Number(raw.limit) || 20)),
  };
}

const byNewest = (a, b) => {
  const ta = a.postedDate ? Date.parse(a.postedDate) : 0;
  const tb = b.postedDate ? Date.parse(b.postedDate) : 0;
  return tb - ta;
};

export async function aggregateJobs(rawParams) {
  const params = normalizeParams(rawParams);
  const cacheKey = JSON.stringify(params);
  const cached = getCached(cacheKey);
  if (cached) {
    cached.providers.forEach(({ name, status, count }) => {
      console.info(`[jobs] ${name} cached status: ${status}, ${count} job(s)`);
    });
    return { ...cached, cached: true };
  }

  const active = PROVIDERS.filter((p) => p.enabled());
  const skipped = PROVIDERS.filter((p) => !p.enabled()).map((p) => {
    console.info(`[jobs] ${p.name} skipped: no API key configured`);
    return { name: p.name, status: "skipped (no API key)", count: 0 };
  });

  // All providers run in parallel; one failing never breaks the others.
  const settled = await Promise.allSettled(
    active.map(async (provider) => {
      const started = Date.now();
      const jobs = await provider.search(params);
      return { name: provider.name, jobs, ms: Date.now() - started };
    })
  );

  const allJobs = [];
  const providerStatus = [...skipped];

  settled.forEach((result, i) => {
    const name = active[i].name;
    if (result.status === "fulfilled") {
      allJobs.push(...result.value.jobs);
      console.info(
        `[jobs] ${name} responded with ${result.value.jobs.length} job(s) in ${result.value.ms}ms`
      );
      providerStatus.push({ name, status: "ok", count: result.value.jobs.length, ms: result.value.ms });
    } else {
      const message = result.reason?.name === "AbortError" ? "timeout" : result.reason?.message || "error";
      console.error(`[jobs] ${name} failed: ${message}`);
      providerStatus.push({ name, status: `failed: ${message}`, count: 0 });
    }
  });

  // Drop listings with no way to apply
  const usable = allJobs.filter((j) => j.applyLink);
  const internships = deduplicateJobs(usable).sort(byNewest);
  console.info(`[jobs] search complete: ${internships.length} usable unique job(s)`);

  const response = {
    success: true,
    internships,
    jobs: internships, // alias
    totalResults: internships.length,
    page: params.page,
    hasMore: internships.length > 0,
    providers: providerStatus,
    source: "aggregated",
  };

  // Don't cache total outages
  if (internships.length > 0) setCached(cacheKey, response, CACHE_TTL_MS);
  return response;
}
