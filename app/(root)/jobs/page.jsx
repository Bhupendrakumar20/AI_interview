"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { io } from "socket.io-client";
import JobCard from "@/components/JobCard";
import FilterBar from "@/components/FilterBar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fetchJobs } from "@/lib/actions/jobs.action";
import { BouncingBalls } from "@/components/ui/LoadingAnimations";

const QUICK_FILTERS = [
  { label: "All Jobs", value: "all" },
  { label: "Fresher", value: "fresher" },
  { label: "Entry Level", value: "entry-level" },
  { label: "Full-time", value: "full-time" },
  { label: "Part-time", value: "part-time" },
  { label: "Remote", value: "remote" },
  { label: "Hybrid", value: "hybrid" },
  { label: "Contract", value: "contract" },
];

const JOB_CATEGORY_PATTERNS = {
  technology: /\b(technology|software|developer|engineering|engineer|programming|computer|it|devops|web|mobile)\b/i,
  data: /\b(data|analytics|machine learning|artificial intelligence|statistics|business intelligence)\b/i,
  business: /\b(business|finance|sales|operations|management|human resources)\b/i,
  design: /\b(design|designer|ux|ui|visual)\b/i,
  marketing: /\b(marketing|content|social media|seo|communications)\b/i,
};

const DEFAULT_ADVANCED_FILTERS = {
  experience: "all",
  salaryMin: "",
  salaryMax: "",
  category: "all",
  workMode: "all",
  datePosted: "all",
  company: "",
};

function jobText(job) {
  return [
    job.title,
    job.company,
    job.description,
    job.type,
    job.experience,
    ...(Array.isArray(job.skills) ? job.skills : []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function getWorkMode(job) {
  const text = `${jobText(job)} ${job.location || ""}`.toLowerCase();
  if (job.isRemote || /\bremote\b/i.test(text)) return "remote";
  if (/\bhybrid\b/i.test(text)) return "hybrid";
  if (/\b(on[- ]?site|in[- ]office|in[- ]person)\b/i.test(text)) return "on-site";
  return "unknown";
}

function getExperienceYears(job) {
  const text = `${job.experience || ""} ${job.title || ""} ${job.description || ""}`;
  if (/\b(fresher|new grad|recent graduate|no experience)\b/i.test(text)) return 0;
  const match = text.match(/(\d+(?:\.\d+)?)\s*(?:\+|[-–]\s*\d+(?:\.\d+)?)?\s*(?:years?|yrs?)/i);
  return match ? Number(match[1]) : null;
}

function matchesExperience(job, range) {
  const years = getExperienceYears(job);
  if (range === "all") return true;
  if (range === "fresher") return years === 0;
  if (years === null) return false;
  if (range === "0-1") return years >= 0 && years <= 1;
  if (range === "1-3") return years > 1 && years <= 3;
  if (range === "3-5") return years > 3 && years <= 5;
  return years > 5;
}

function matchesQuickFilter(job, filter) {
  const text = jobText(job);
  const mode = getWorkMode(job);
  if (filter === "all") return true;
  if (filter === "fresher") return getExperienceYears(job) === 0;
  if (filter === "entry-level") {
    const years = getExperienceYears(job);
    return /\b(entry[- ]level|junior|graduate)\b/i.test(text) || (years !== null && years <= 1);
  }
  if (filter === "full-time") return /\b(full[-_ ]?time|fulltime)\b/i.test(text);
  if (filter === "part-time") return /\b(part[-_ ]?time|parttime)\b/i.test(text);
  if (filter === "contract") return /\b(contract|contractor|temporary)\b/i.test(text);
  return mode === filter;
}

function parseSalaryRange(job) {
  const values = String(job.salary || job.stipend || "")
    .match(/\d[\d,]*/g)
    ?.map((value) => Number(value.replace(/,/g, "")))
    .filter(Number.isFinite) || [];
  if (values.length === 0) return null;
  return { min: values[0], max: values[1] ?? values[0] };
}

function matchesDatePosted(job, datePosted) {
  if (datePosted === "all") return true;
  const postedAt = Date.parse(job.postedDate || job.createdAt || "");
  if (!Number.isFinite(postedAt)) return false;
  const maxAge = datePosted === "24h" ? 24 : datePosted === "7d" ? 24 * 7 : 24 * 30;
  return Date.now() - postedAt <= maxAge * 60 * 60 * 1000;
}

function matchesAdvancedFilters(job, filters) {
  if (!matchesExperience(job, filters.experience)) return false;

  const salaryMin = Number(filters.salaryMin);
  const salaryMax = Number(filters.salaryMax);
  if (filters.salaryMin || filters.salaryMax) {
    const salary = parseSalaryRange(job);
    if (!salary) return false;
    if (filters.salaryMin && salary.max < salaryMin) return false;
    if (filters.salaryMax && salary.min > salaryMax) return false;
  }

  if (
    filters.category !== "all" &&
    !JOB_CATEGORY_PATTERNS[filters.category]?.test(jobText(job))
  ) {
    return false;
  }

  if (filters.workMode !== "all" && getWorkMode(job) !== filters.workMode) return false;
  if (!matchesDatePosted(job, filters.datePosted)) return false;
  if (filters.company && !String(job.company || "").toLowerCase().includes(filters.company.toLowerCase())) {
    return false;
  }

  return true;
}

export default function JobsPage() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [source, setSource] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [locationInput, setLocationInput] = useState("all");
  const [submittedSearch, setSubmittedSearch] = useState("developer jobs");
  const [submittedLocation, setSubmittedLocation] = useState("all");
  const [quickFilter, setQuickFilter] = useState("all");
  const [advancedFilters, setAdvancedFilters] = useState(DEFAULT_ADVANCED_FILTERS);

  const loadJobs = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await fetchJobs(submittedSearch || "developer jobs", {
        page: 1,
        country: "us",
        limit: 50,
        type: "job",
        location: submittedLocation === "remote" ? "remote" : "",
      });

      if (result.success) {
        setJobs(result.jobs || []);
        setSource(result.source || "");
        if (result.error) console.warn("Jobs API warning:", result.error);
      } else {
        setError(result.error || "Failed to load jobs.");
        setJobs([]);
      }
    } catch (err) {
      console.error("Failed to load jobs:", err);
      setError("Failed to load jobs. Please try again later.");
      setJobs([]);
    } finally {
      setLoading(false);
    }
  }, [submittedSearch, submittedLocation]);

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  useEffect(() => {
    const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
    const socketUrl = isLocal
      ? "http://localhost:4002"
      : process.env.NEXT_PUBLIC_SOCKET_IO_URL || "http://localhost:4002";
    const socket = io(socketUrl, {
      transports: ["websocket", "polling"],
      reconnectionAttempts: 5,
    });

    socket.on("content-updated", ({ contentType }) => {
      if (contentType === "jobs") loadJobs();
    });

    return () => socket.disconnect();
  }, [loadJobs]);

  const visibleJobs = useMemo(
    () =>
      jobs.filter(
        (job) =>
          matchesQuickFilter(job, quickFilter) &&
          matchesAdvancedFilters(job, advancedFilters) &&
          (submittedLocation === "all" ||
            submittedLocation === "remote" ||
            getWorkMode(job) === submittedLocation)
      ),
    [jobs, quickFilter, advancedFilters, submittedLocation]
  );

  const quickFilterOptions = QUICK_FILTERS.map((filter) => ({
    ...filter,
    count: jobs.filter((job) => matchesQuickFilter(job, filter.value)).length,
  }));

  const handleSearch = (event) => {
    event.preventDefault();
    setSubmittedSearch(searchInput.trim() || "developer jobs");
    setSubmittedLocation(locationInput);
  };

  const updateAdvancedFilter = (key, value) => {
    setAdvancedFilters((current) => ({ ...current, [key]: value }));
  };

  return (
    <div className="space-y-6">
      <div className="text-center py-8">
        <h1 className="text-5xl font-bold mb-4">Find Your Next Job</h1>
        <p className="text-light-100 text-lg max-w-3xl mx-auto">
          Search full-time and part-time opportunities from connected job providers.
        </p>
      </div>

      <div className="card-border">
        <div className="card p-4">
          <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4">
            <Input
              type="search"
              placeholder="Search jobs by title, company, or skill..."
              className="flex-1 bg-dark-200 text-light-100 px-4 py-3 rounded-lg outline-none"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
            />
            <select
              className="bg-dark-200 text-light-100 px-4 py-3 rounded-lg"
              value={locationInput}
              onChange={(event) => setLocationInput(event.target.value)}
            >
              <option value="all">All Locations</option>
              <option value="remote">Remote</option>
              <option value="hybrid">Hybrid</option>
              <option value="on-site">On-site</option>
            </select>
            <Button type="submit" className="btn-primary px-8">Search</Button>
          </form>
        </div>
      </div>

      <FilterBar
        filters={quickFilterOptions}
        activeFilter={quickFilter}
        onFilterChange={setQuickFilter}
      />

      <details className="card-border group">
        <summary className="card px-5 py-4 cursor-pointer font-semibold">
          Advanced Filters
        </summary>
        <div className="card p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <label className="space-y-2 text-sm text-light-100">
            <span>Experience</span>
            <select
              className="w-full bg-dark-200 text-light-100 px-3 py-2 rounded-lg"
              value={advancedFilters.experience}
              onChange={(event) => updateAdvancedFilter("experience", event.target.value)}
            >
              <option value="all">Any experience</option>
              <option value="fresher">Fresher</option>
              <option value="0-1">0–1 years</option>
              <option value="1-3">1–3 years</option>
              <option value="3-5">3–5 years</option>
              <option value="5+">5+ years</option>
            </select>
          </label>

          <div className="space-y-2 text-sm text-light-100">
            <span>Salary Range</span>
            <div className="flex gap-2">
              <Input type="number" min="0" placeholder="Min" value={advancedFilters.salaryMin}
                onChange={(event) => updateAdvancedFilter("salaryMin", event.target.value)} />
              <Input type="number" min="0" placeholder="Max" value={advancedFilters.salaryMax}
                onChange={(event) => updateAdvancedFilter("salaryMax", event.target.value)} />
            </div>
          </div>

          <label className="space-y-2 text-sm text-light-100">
            <span>Job Category</span>
            <select className="w-full bg-dark-200 text-light-100 px-3 py-2 rounded-lg"
              value={advancedFilters.category}
              onChange={(event) => updateAdvancedFilter("category", event.target.value)}>
              <option value="all">All categories</option>
              <option value="technology">Technology</option>
              <option value="data">Data</option>
              <option value="business">Business</option>
              <option value="design">Design</option>
              <option value="marketing">Marketing</option>
            </select>
          </label>

          <label className="space-y-2 text-sm text-light-100">
            <span>Work Mode</span>
            <select className="w-full bg-dark-200 text-light-100 px-3 py-2 rounded-lg"
              value={advancedFilters.workMode}
              onChange={(event) => updateAdvancedFilter("workMode", event.target.value)}>
              <option value="all">All work modes</option>
              <option value="remote">Remote</option>
              <option value="hybrid">Hybrid</option>
              <option value="on-site">On-site</option>
            </select>
          </label>

          <label className="space-y-2 text-sm text-light-100">
            <span>Date Posted</span>
            <select className="w-full bg-dark-200 text-light-100 px-3 py-2 rounded-lg"
              value={advancedFilters.datePosted}
              onChange={(event) => updateAdvancedFilter("datePosted", event.target.value)}>
              <option value="all">Any time</option>
              <option value="24h">Last 24 hours</option>
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
            </select>
          </label>

          <label className="space-y-2 text-sm text-light-100">
            <span>Company</span>
            <Input value={advancedFilters.company} placeholder="Company name"
              onChange={(event) => updateAdvancedFilter("company", event.target.value)} />
          </label>

          <div className="sm:col-span-2 lg:col-span-4 flex justify-end">
            <Button type="button" variant="outline" onClick={() => setAdvancedFilters(DEFAULT_ADVANCED_FILTERS)}>
              Clear Advanced Filters
            </Button>
          </div>
        </div>
      </details>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-3xl font-bold">Job Opportunities ({visibleJobs.length})</h2>
          {source === "aggregated" && jobs.length > 0 && (
            <p className="text-sm text-green-500 mt-2">Live listings from connected providers</p>
          )}
        </div>
        <Button
          variant="outline"
          onClick={() => {
            setQuickFilter("all");
            setAdvancedFilters(DEFAULT_ADVANCED_FILTERS);
          }}
        >
          Clear Filters
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <BouncingBalls size="lg" label="Loading career opportunities..." />
        </div>
      ) : error ? (
        <div className="bg-red-500/10 border border-red-500 text-red-300 p-4 rounded-lg">
          {error}
        </div>
      ) : visibleJobs.length === 0 ? (
        <div className="bg-dark-200 border border-dark-300 p-8 rounded-lg text-center text-light-100">
          No jobs match these filters. Try changing your search or filters.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {visibleJobs.map((job) => (
            <JobCard key={job.id} job={job} />
          ))}
        </div>
      )}
    </div>
  );
}
