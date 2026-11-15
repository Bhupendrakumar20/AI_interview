// Shared helpers + the common job shape every provider must return.

const STOP_WORDS = new Set([
  "intern", "internship", "internships", "job", "jobs", "the", "and", "in", "for", "a", "of",
]);

export function stripHtml(html = "") {
  return String(html)
    .replace(/<style[\s\S]*?<\/style>|<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

export function toIsoDate(value) {
  if (!value) return null;
  // Unix seconds (Arbeitnow) vs milliseconds
  const d = typeof value === "number" ? new Date(value < 1e12 ? value * 1000 : value) : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export function formatSalary({ min, max, currency, period } = {}) {
  if (!min && !max) return "Not disclosed";
  const cur = currency ? `${currency} ` : "";
  const per = period ? ` / ${String(period).toLowerCase()}` : "";
  const fmt = (n) => Number(n).toLocaleString("en-US", { maximumFractionDigits: 0 });
  if (min && max && min !== max) return `${cur}${fmt(min)} - ${fmt(max)}${per}`;
  return `${cur}${fmt(min || max)}${per}`;
}

export function queryTokens(query = "") {
  return String(query)
    .toLowerCase()
    .split(/[^a-z0-9+#.]+/)
    .filter((t) => t.length > 1 && !STOP_WORDS.has(t));
}

// Used by providers with no server-side search (Arbeitnow). Matches ANY meaningful token.
export function matchesQuery(job, query) {
  const tokens = queryTokens(query);
  if (tokens.length === 0) return true;
  const haystack = `${job.title} ${job.company} ${job.skills.join(" ")} ${job.description}`.toLowerCase();
  return tokens.some((t) => haystack.includes(t));
}

export function looksLikeInternship(job) {
  return /intern|trainee|praktik|werkstudent/i.test(`${job.title} ${job.type}`);
}

// Every provider builds jobs through this so the UI always gets the same shape.
export function buildJob(partial) {
  const applyLink = partial.applyLink || partial.url || "";
  return {
    id: String(partial.id ?? applyLink),
    title: partial.title || "Untitled role",
    company: partial.company || "Unknown company",
    location: partial.location || (partial.isRemote ? "Remote" : "Not specified"),
    isRemote: Boolean(partial.isRemote),
    stipend: partial.stipend || "Not disclosed",
    duration: partial.duration || partial.type || "Not specified",
    description: partial.description || "",
    type: partial.type || "Not specified",
    applyLink,
    url: applyLink,
    postedDate: partial.postedDate || null,
    deadline: partial.deadline || null,
    skills: Array.isArray(partial.skills) ? partial.skills.filter(Boolean) : [],
    applicants: 0,
    badge: partial.badge ?? null,
    source: partial.source || "Unknown",
    sources: partial.sources || [partial.source || "Unknown"],
  };
}
