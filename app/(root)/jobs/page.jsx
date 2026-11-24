"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { io } from "socket.io-client";
import JobCard from "@/components/JobCard";
import FilterBar from "@/components/FilterBar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fetchJobs } from "@/lib/actions/jobs.action";
import { BouncingBalls } from "@/components/ui/LoadingAnimations";
import { Search, MapPin, SlidersHorizontal, ChevronDown, RotateCcw, GraduationCap, IndianRupee, Briefcase, Laptop, Calendar, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";

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
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);

  const activeAdvancedCount = [
    advancedFilters.experience !== "all",
    Boolean(advancedFilters.salaryMin || advancedFilters.salaryMax),
    advancedFilters.category !== "all",
    advancedFilters.workMode !== "all",
    advancedFilters.datePosted !== "all",
    Boolean(advancedFilters.company),
  ].filter(Boolean).length;

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
      <div className="text-center py-6 sm:py-8 max-w-3xl mx-auto">
        <h1 className="text-4xl sm:text-5xl font-black mb-3 leading-tight tracking-tight text-slate-900 dark:text-white">
          Find Your Next{" "}
          <span className="bg-linear-to-r from-blue-600 via-indigo-600 to-purple-600 dark:from-blue-400 dark:via-indigo-300 dark:to-purple-400 bg-clip-text text-transparent">
            Career Move
          </span>
        </h1>
        <p className="text-slate-600 dark:text-slate-300 text-sm sm:text-base leading-relaxed">
          Search verified full-time, part-time, and remote opportunities from connected job providers.
        </p>
      </div>

      {/* Search & Filter Console */}
      <div className="premium-card-glass p-4 sm:p-6 shadow-xl relative overflow-hidden rounded-2xl border border-slate-200/80 dark:border-slate-800/80 backdrop-blur-xl">
        <div className="absolute -top-24 -right-24 w-80 h-80 bg-indigo-500/10 dark:bg-indigo-500/15 rounded-full blur-3xl -z-10 pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-purple-500/10 dark:bg-purple-500/15 rounded-full blur-3xl -z-10 pointer-events-none" />

        <form onSubmit={handleSearch} className="flex flex-col gap-4">
          {/* Top Search Bar Row */}
          <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center">
            {/* Keyword Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500 pointer-events-none" />
              <input
                type="search"
                placeholder="Search jobs by title, company, or skill..."
                className="w-full pl-10 pr-4 py-3 bg-white/90 dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-700/80 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all shadow-xs"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
              />
            </div>

            {/* Location Select */}
            <div className="relative md:w-56">
              <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500 pointer-events-none" />
              <select
                className="w-full pl-10 pr-9 py-3 bg-white/90 dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-700/80 rounded-xl text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all appearance-none cursor-pointer shadow-xs"
                value={locationInput}
                onChange={(event) => setLocationInput(event.target.value)}
              >
                <option value="all">All Locations</option>
                <option value="remote">Remote</option>
                <option value="hybrid">Hybrid</option>
                <option value="on-site">On-site</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>

            {/* Filters Toggle Button */}
            <button
              type="button"
              onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
              className={cn(
                "px-4 py-3 rounded-xl border text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer shadow-xs select-none active:scale-95",
                isAdvancedOpen || activeAdvancedCount > 0
                  ? "bg-indigo-50 dark:bg-indigo-950/60 border-indigo-300 dark:border-indigo-500/60 text-indigo-700 dark:text-indigo-300 shadow-sm shadow-indigo-500/10"
                  : "bg-white/90 dark:bg-slate-900/80 border-slate-200/90 dark:border-slate-700/80 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/80 hover:border-slate-300 dark:hover:border-slate-600"
              )}
            >
              <SlidersHorizontal className="w-4 h-4 text-indigo-500" />
              <span>Filters</span>
              {activeAdvancedCount > 0 && (
                <span className="w-5 h-5 rounded-full bg-linear-to-r from-indigo-600 to-purple-600 text-white text-[11px] font-bold flex items-center justify-center shadow-xs">
                  {activeAdvancedCount}
                </span>
              )}
              <ChevronDown className={cn("w-3.5 h-3.5 text-slate-400 transition-transform duration-200", isAdvancedOpen && "rotate-180 text-indigo-500")} />
            </button>

            {/* Search Submit Button */}
            <button
              type="submit"
              className="px-6 py-3 rounded-xl bg-linear-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-sm shadow-md shadow-indigo-500/25 hover:shadow-lg hover:shadow-indigo-500/35 transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 active:scale-95"
            >
              <Search className="w-4 h-4" />
              <span>Search</span>
            </button>
          </div>

          {/* Expandable Advanced Filters Drawer */}
          {isAdvancedOpen && (
            <div className="mt-2 pt-4 border-t border-slate-200/75 dark:border-slate-800/80 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="bg-slate-50/70 dark:bg-slate-950/40 rounded-2xl p-4 sm:p-5 border border-slate-200/70 dark:border-slate-800/60 backdrop-blur-xs">
                {/* Drawer Header */}
                <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-200/70 dark:border-slate-800/70">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Advanced Job Filters</span>
                  </div>
                  {activeAdvancedCount > 0 && (
                    <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/80 dark:border-indigo-800/60 font-semibold">
                      {activeAdvancedCount} filter{activeAdvancedCount > 1 ? "s" : ""} applied
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Experience */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <GraduationCap className="w-3.5 h-3.5 text-indigo-500" />
                      <span>Experience Level</span>
                    </label>
                    <div className="relative">
                      <select
                        className="w-full bg-white/95 dark:bg-slate-900/90 border border-slate-200/90 dark:border-slate-700/80 text-slate-900 dark:text-white pl-3.5 pr-8 py-2.5 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-500 transition-all appearance-none cursor-pointer shadow-xs"
                        value={advancedFilters.experience}
                        onChange={(event) => updateAdvancedFilter("experience", event.target.value)}
                      >
                        <option value="all">Any experience</option>
                        <option value="fresher">Fresher (0 yrs)</option>
                        <option value="0-1">0–1 years</option>
                        <option value="1-3">1–3 years</option>
                        <option value="3-5">3–5 years</option>
                        <option value="5+">5+ years</option>
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>
                  </div>

                  {/* Salary Range */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <IndianRupee className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Salary Range (₹)</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">₹</span>
                        <input
                          type="number"
                          min="0"
                          placeholder="Min"
                          className="w-full pl-6 pr-3 py-2.5 bg-white/95 dark:bg-slate-900/90 border border-slate-200/90 dark:border-slate-700/80 text-slate-900 dark:text-white rounded-xl text-xs sm:text-sm placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-500 transition-all shadow-xs"
                          value={advancedFilters.salaryMin}
                          onChange={(event) => updateAdvancedFilter("salaryMin", event.target.value)}
                        />
                      </div>
                      <span className="text-slate-400 font-medium text-xs">to</span>
                      <div className="relative flex-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">₹</span>
                        <input
                          type="number"
                          min="0"
                          placeholder="Max"
                          className="w-full pl-6 pr-3 py-2.5 bg-white/95 dark:bg-slate-900/90 border border-slate-200/90 dark:border-slate-700/80 text-slate-900 dark:text-white rounded-xl text-xs sm:text-sm placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-500 transition-all shadow-xs"
                          value={advancedFilters.salaryMax}
                          onChange={(event) => updateAdvancedFilter("salaryMax", event.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Job Category */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Briefcase className="w-3.5 h-3.5 text-blue-500" />
                      <span>Category</span>
                    </label>
                    <div className="relative">
                      <select
                        className="w-full bg-white/95 dark:bg-slate-900/90 border border-slate-200/90 dark:border-slate-700/80 text-slate-900 dark:text-white pl-3.5 pr-8 py-2.5 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-500 transition-all appearance-none cursor-pointer shadow-xs"
                        value={advancedFilters.category}
                        onChange={(event) => updateAdvancedFilter("category", event.target.value)}
                      >
                        <option value="all">All categories</option>
                        <option value="technology">Technology & IT</option>
                        <option value="data">Data & Machine Learning</option>
                        <option value="business">Business & Finance</option>
                        <option value="design">Design & Creative</option>
                        <option value="marketing">Marketing & Sales</option>
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>
                  </div>

                  {/* Work Mode */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Laptop className="w-3.5 h-3.5 text-purple-500" />
                      <span>Work Mode</span>
                    </label>
                    <div className="relative">
                      <select
                        className="w-full bg-white/95 dark:bg-slate-900/90 border border-slate-200/90 dark:border-slate-700/80 text-slate-900 dark:text-white pl-3.5 pr-8 py-2.5 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-500 transition-all appearance-none cursor-pointer shadow-xs"
                        value={advancedFilters.workMode}
                        onChange={(event) => updateAdvancedFilter("workMode", event.target.value)}
                      >
                        <option value="all">All work modes</option>
                        <option value="remote">Remote</option>
                        <option value="hybrid">Hybrid</option>
                        <option value="on-site">On-site</option>
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>
                  </div>

                  {/* Date Posted */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-amber-500" />
                      <span>Date Posted</span>
                    </label>
                    <div className="relative">
                      <select
                        className="w-full bg-white/95 dark:bg-slate-900/90 border border-slate-200/90 dark:border-slate-700/80 text-slate-900 dark:text-white pl-3.5 pr-8 py-2.5 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-500 transition-all appearance-none cursor-pointer shadow-xs"
                        value={advancedFilters.datePosted}
                        onChange={(event) => updateAdvancedFilter("datePosted", event.target.value)}
                      >
                        <option value="all">Any time</option>
                        <option value="24h">Last 24 hours</option>
                        <option value="7d">Last 7 days</option>
                        <option value="30d">Last 30 days</option>
                      </select>
                      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    </div>
                  </div>

                  {/* Company Name */}
                  <div className="space-y-1.5 sm:col-span-2 lg:col-span-3">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-pink-500" />
                      <span>Target Company</span>
                    </label>
                    <input
                      value={advancedFilters.company}
                      placeholder="Search by specific company (e.g. Google, Microsoft, Infosys)..."
                      className="w-full bg-white/95 dark:bg-slate-900/90 border border-slate-200/90 dark:border-slate-700/80 text-slate-900 dark:text-white px-3.5 py-2.5 rounded-xl text-xs sm:text-sm placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-500 transition-all shadow-xs"
                      onChange={(event) => updateAdvancedFilter("company", event.target.value)}
                    />
                  </div>
                </div>

                {/* Clear Filters Row */}
                <div className="flex items-center justify-between mt-5 pt-3.5 border-t border-slate-200/70 dark:border-slate-800/70">
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {activeAdvancedCount > 0 ? `${activeAdvancedCount} filter(s) applied` : "Tip: Refine your job search with experience and salary limits"}
                  </span>
                  {activeAdvancedCount > 0 && (
                    <button
                      type="button"
                      onClick={() => setAdvancedFilters(DEFAULT_ADVANCED_FILTERS)}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 transition-colors cursor-pointer py-1.5 px-3 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200/60 dark:border-rose-900/40 active:scale-95"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Clear Advanced Filters</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </form>
      </div>

      <FilterBar
        filters={quickFilterOptions}
        activeFilter={quickFilter}
        onFilterChange={setQuickFilter}
      />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Job Opportunities
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/80 dark:border-indigo-800/60 shadow-xs">
              {visibleJobs.length}
            </span>
          </div>
          {source === "aggregated" && jobs.length > 0 && (
            <p className="text-xs sm:text-sm text-emerald-600 dark:text-emerald-400 mt-1 font-medium flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Live aggregated listings from connected providers
            </p>
          )}
        </div>
        {(quickFilter !== "all" || activeAdvancedCount > 0) && (
          <button
            type="button"
            onClick={() => {
              setQuickFilter("all");
              setAdvancedFilters(DEFAULT_ADVANCED_FILTERS);
            }}
            className="self-start sm:self-auto px-3.5 py-2 bg-white/90 dark:bg-slate-900/80 border border-rose-200/80 dark:border-rose-900/50 rounded-xl text-xs sm:text-sm font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-all shadow-xs cursor-pointer inline-flex items-center gap-1.5 active:scale-95"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset All Filters</span>
          </button>
        )}
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
        <div className="premium-card-glass p-8 text-center text-slate-600 dark:text-slate-300 shadow-md">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">No jobs match these filters</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-4">
            Try adjusting your search terms, work mode, or salary range.
          </p>
          <button
            type="button"
            onClick={() => {
              setQuickFilter("all");
              setAdvancedFilters(DEFAULT_ADVANCED_FILTERS);
            }}
            className="btn-theme-action px-5 py-2.5 text-sm"
          >
            Clear All Filters
          </button>
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
