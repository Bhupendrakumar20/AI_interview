// app/(root)/internships/page.jsx

"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { io } from "socket.io-client";
import InternshipCard from "@/components/InternshipCard";
import FilterBar from "@/components/FilterBar";
import ApplicationModal from "@/components/ApplicationModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { searchInternships } from "@/lib/actions/general.action";
import { searchInternshipsJSearch } from "@/lib/actions/jsearch.action";
import { getCurrentUser } from "@/lib/actions/auth.action";
import { toast } from "sonner";
import { BouncingBalls } from "@/components/ui/LoadingAnimations";
import { Search, MapPin, SlidersHorizontal, ChevronDown, RotateCcw, Briefcase, IndianRupee, Clock, Laptop, Calendar, Sparkles, ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/utils";

const INTERNSHIP_CACHE_KEY = "prepwise:internships:v2";
const CATEGORY_PATTERNS = {
  tech: /\b(tech|technology|software|developer|engineering|engineer|programming|computer|it|devops|web|mobile)\b/i,
  data: /\b(data|analytics|machine learning|artificial intelligence|statistics|business intelligence)\b/i,
  business: /\b(business|marketing|finance|sales|management|operations|human resources|product management)\b/i,
};

function internshipSearchText(internship) {
  return [
    internship.title,
    internship.company,
    internship.description,
    internship.type,
    ...(Array.isArray(internship.skills) ? internship.skills : []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function matchesCategory(internship, category) {
  return (
    String(internship.type || "").toLowerCase() === category ||
    CATEGORY_PATTERNS[category].test(internshipSearchText(internship))
  );
}

function isRemoteInternship(internship) {
  return internship.isRemote === true || /remote/i.test(String(internship.location || ""));
}

function stipendAmount(internship) {
  return Number.parseInt(String(internship.stipend || "").replace(/[^0-9]/g, ""), 10) || 0;
}

function getDurationMonths(internship) {
  const text = `${internship.duration || ""} ${internship.description || ""}`;
  const match = text.match(/(\d+(?:\.\d+)?)(?:\s*[-–]\s*(\d+(?:\.\d+)?))?\s*(weeks?|months?|mos?|years?)/i);
  if (!match) return null;

  const multiplier = /^week/i.test(match[3]) ? 0.25 : /^year/i.test(match[3]) ? 12 : 1;
  const first = Number(match[1]) * multiplier;
  const second = match[2] ? Number(match[2]) * multiplier : first;
  return { min: Math.min(first, second), max: Math.max(first, second) };
}

function matchesDuration(internship, duration) {
  if (duration === "all") return true;
  const months = getDurationMonths(internship);
  if (!months) return false;

  const ranges = {
    "1-3": { min: 1, max: 3 },
    "3-6": { min: 3, max: 6 },
    "6-12": { min: 6, max: 12 },
  };
  const range = ranges[duration];
  return months.max >= range.min && months.min <= range.max;
}

function matchesWorkMode(internship, mode) {
  if (mode === "all") return true;
  const text = `${internshipSearchText(internship)} ${internship.location || ""}`.toLowerCase();
  if (mode === "remote") return isRemoteInternship(internship);
  if (mode === "hybrid") return /\bhybrid\b/i.test(text);
  return /\b(on[- ]?site|in[- ]office|in[- ]person)\b/i.test(text);
}

function matchesDatePosted(internship, datePosted) {
  if (datePosted === "all") return true;
  const postedAt = Date.parse(internship.postedDate || internship.postedAt || internship.createdAt || "");
  if (!Number.isFinite(postedAt)) return false;
  const maxAge = datePosted === "24h" ? 24 : datePosted === "7d" ? 24 * 7 : 24 * 30;
  return Date.now() - postedAt <= maxAge * 60 * 60 * 1000;
}

function isOpenInternship(internship) {
  const status = `${internship.status || ""} ${internship.applicationStatus || ""}`.toLowerCase();
  if (internship.active === false || /\b(closed|expired)\b/.test(status)) return false;

  const deadline = Date.parse(internship.deadline || "");
  return !Number.isFinite(deadline) || deadline >= Date.now();
}

function matchesInternshipType(internship, type) {
  if (type === "tech" || type === "data" || type === "business") {
    return matchesCategory(internship, type);
  }
  if (type === "quick") {
    return internship.quickApply === true ||
      String(internship.type || "").toLowerCase() === "quick" ||
      /\bquick apply\b/i.test(internshipSearchText(internship));
  }
  if (type === "remote") return isRemoteInternship(internship);
  if (type === "paid") {
    return stipendAmount(internship) > 0 &&
      !/\b(unpaid|not disclosed|competitive|negotiable)\b/i.test(String(internship.stipend || ""));
  }
  if (type === "high") return stipendAmount(internship) >= 8000;
  return true;
}

function readCachedInternships() {
  try {
    const cached = sessionStorage.getItem(INTERNSHIP_CACHE_KEY);
    if (!cached) return null;
    const internships = JSON.parse(cached);
    return Array.isArray(internships) ? internships : null;
  } catch (error) {
    console.error("[internships] failed to read session cache:", error);
    return null;
  }
}

function cacheInternships(internships) {
  try {
    sessionStorage.setItem(INTERNSHIP_CACHE_KEY, JSON.stringify(internships));
  } catch (error) {
    console.error("[internships] failed to write session cache:", error);
  }
}

function calculateInternshipCounts(internships) {
  return {
    all: internships.length,
    tech: internships.filter((item) => matchesCategory(item, "tech")).length,
    data: internships.filter((item) => matchesCategory(item, "data")).length,
    business: internships.filter((item) => matchesCategory(item, "business")).length,
    quick: internships.filter((item) => matchesInternshipType(item, "quick")).length,
    remote: internships.filter(isRemoteInternship).length,
    paid: internships.filter((item) => matchesInternshipType(item, "paid")).length,
    high: internships.filter((item) => stipendAmount(item) >= 8000).length,
  };
}

export default function InternshipsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [internships, setInternships] = useState([]);
  const [filterOptions, setFilterOptions] = useState({ locations: [], types: [] });
  const [counts, setCounts] = useState({});
  const [showApplicationModal, setShowApplicationModal] = useState(false);
  const [selectedInternship, setSelectedInternship] = useState(null);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);

  const [filters, setFilters] = useState(() => {
    return {
      search: searchParams.get("search") || "",
      location: searchParams.get("location") || "all",
      type: searchParams.get("type") || "all",
      domain: searchParams.get("domain") || "all",
      stipendMin: searchParams.get("stipendMin") || "",
      stipendMax: searchParams.get("stipendMax") || "",
      duration: searchParams.get("duration") || "all",
      workMode: searchParams.get("workMode") || "all",
      datePosted: searchParams.get("datePosted") || "all",
      skills: searchParams.get("skills") || "",
      sort: searchParams.get("sort") || "deadline",
    };
  });

  const activeAdvancedCount = [
    filters.domain !== "all",
    Boolean(filters.stipendMin || filters.stipendMax),
    filters.duration !== "all",
    filters.workMode !== "all",
    filters.datePosted !== "all",
    Boolean(filters.skills),
  ].filter(Boolean).length;

  // Sync filters with URL params on back/forward navigation
  useEffect(() => {
    const type = searchParams.get("type") || "all";
    const search = searchParams.get("search") || "";
    const location = searchParams.get("location") || "all";
    const domain = searchParams.get("domain") || "all";
    const stipendMin = searchParams.get("stipendMin") || "";
    const stipendMax = searchParams.get("stipendMax") || "";
    const duration = searchParams.get("duration") || "all";
    const workMode = searchParams.get("workMode") || "all";
    const datePosted = searchParams.get("datePosted") || "all";
    const skills = searchParams.get("skills") || "";
    const sort = searchParams.get("sort") || "deadline";

    setFilters((prev) => {
      if (
        prev.type === type &&
        prev.search === search &&
        prev.location === location &&
        prev.domain === domain &&
        prev.stipendMin === stipendMin &&
        prev.stipendMax === stipendMax &&
        prev.duration === duration &&
        prev.workMode === workMode &&
        prev.datePosted === datePosted &&
        prev.skills === skills &&
        prev.sort === sort
      ) {
        return prev; // No change, skip update
      }
      return {
        search,
        location,
        type,
        domain,
        stipendMin,
        stipendMax,
        duration,
        workMode,
        datePosted,
        skills,
        sort,
      };
    });
  }, [searchParams]);

  // Load user
  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await getCurrentUser();
        setUser(currentUser);
      } catch (error) {
        console.error("Error loading user:", error);
      }
    };
    loadUser();
  }, []);

  // Load internships and filter options
  const loadInternships = useCallback(async () => {
    setLoading(true);
    try {
      let allInternships = readCachedInternships();

      if (allInternships === null) {
        console.log("[internships] fetching from configured providers");
        const apiResult = await searchInternshipsJSearch({
          searchTerm: "internship",
          location: "all",
          type: "internship",
          page: 1,
        });

        console.log("[internships] provider results:", apiResult.providers || []);
        allInternships = (apiResult.internships || []).filter(isOpenInternship);

        if (allInternships.length === 0) {
          console.log("[internships] no open provider results; falling back to Firebase");
          const firebaseData = await searchInternships({
            type: null,
            location: null,
            search: "",
            limit: 50,
          });
          allInternships = (firebaseData || []).filter(isOpenInternship);
        }

        cacheInternships(allInternships);
      } else {
        console.log(`[internships] reusing ${allInternships.length} session-cached result(s)`);
      }

      allInternships = allInternships.filter(isOpenInternship);
      setFilterOptions({
        locations: [...new Set(allInternships.map((item) => item.location).filter(Boolean))].sort(),
        types: [],
      });

      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        allInternships = allInternships.filter((item) =>
          internshipSearchText(item).includes(searchLower)
        );
      }

      if (filters.location !== "all") {
        allInternships = allInternships.filter((item) =>
          filters.location === "remote"
            ? isRemoteInternship(item)
            : String(item.location || "").toLowerCase().includes(filters.location.toLowerCase())
        );
      }

      if (filters.type !== "all") {
        allInternships = allInternships.filter((item) =>
          matchesInternshipType(item, filters.type)
        );
      }

      if (filters.domain !== "all") {
        allInternships = allInternships.filter((item) => matchesCategory(item, filters.domain));
      }

      if (filters.stipendMin || filters.stipendMax) {
        allInternships = allInternships.filter((item) => {
          const stipend = stipendAmount(item);
          if (stipend === 0) return false;
          return (!filters.stipendMin || stipend >= Number(filters.stipendMin)) &&
            (!filters.stipendMax || stipend <= Number(filters.stipendMax));
        });
      }

      if (filters.duration !== "all") {
        allInternships = allInternships.filter((item) =>
          matchesDuration(item, filters.duration)
        );
      }

      if (filters.workMode !== "all") {
        allInternships = allInternships.filter((item) =>
          matchesWorkMode(item, filters.workMode)
        );
      }

      if (filters.datePosted !== "all") {
        allInternships = allInternships.filter((item) =>
          matchesDatePosted(item, filters.datePosted)
        );
      }

      if (filters.skills) {
        const requiredSkill = filters.skills.toLowerCase();
        allInternships = allInternships.filter((item) =>
          internshipSearchText(item).includes(requiredSkill)
        );
      }

      // Apply sorting
      let sortedData = [...allInternships];
      switch (filters.sort) {
        case "stipend":
          sortedData.sort((a, b) => {
            const aValue = parseInt(String(a.stipend).replace(/[^0-9]/g, "")) || 0;
            const bValue = parseInt(String(b.stipend).replace(/[^0-9]/g, "")) || 0;
            return bValue - aValue;
          });
          break;
        case "popularity":
          sortedData.sort((a, b) => (b.applicants || 0) - (a.applicants || 0));
          break;
        default: // deadline
          sortedData.sort((a, b) => {
            const aDate = new Date(a.deadline || a.postedDate || 0);
            const bDate = new Date(b.deadline || b.postedDate || 0);
            return aDate - bDate;
          });
          break;
      }

      setInternships(sortedData);
      setCounts(calculateInternshipCounts(allInternships));
    } catch (error) {
      console.error("Error loading internships:", error);
      toast.error("Failed to load internships");
      setInternships([]);
      setCounts(calculateInternshipCounts([]));
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // Load data when filters change
  useEffect(() => {
    loadInternships();
  }, [loadInternships]);

  // Socket Real-time Sync
  useEffect(() => {
    const isLocal = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
    const socketUrl = isLocal ? 'http://localhost:4002' : (process.env.NEXT_PUBLIC_SOCKET_IO_URL || 'http://localhost:4002');
    
    console.log(`🔌 Internships page connecting to socket server: ${socketUrl}`);
    const socket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
    });

    socket.on("content-updated", ({ contentType }) => {
      if (contentType === "internships") {
        console.log("🔄 Real-time internships update triggered!");
        loadInternships();
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [loadInternships]);

  // Update URL with filters
  const updateFilters = (newFilters) => {
    const params = new URLSearchParams(searchParams);
    
    Object.entries(newFilters).forEach(([key, value]) => {
      if (value && value !== "all") {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    });

    router.push(`/internships?${params.toString()}`);
  };

  const handleFilterChange = (key, value) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    updateFilters(newFilters);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    updateFilters(filters);
  };

  const clearFilters = () => {
    const clearedFilters = {
      search: "",
      location: "all",
      type: "all",
      domain: "all",
      stipendMin: "",
      stipendMax: "",
      duration: "all",
      workMode: "all",
      datePosted: "all",
      skills: "",
      sort: "deadline",
    };
    setFilters(clearedFilters);
    updateFilters(clearedFilters);
  };

  const clearAdvancedFilters = () => {
    const clearedFilters = {
      ...filters,
      domain: "all",
      stipendMin: "",
      stipendMax: "",
      duration: "all",
      workMode: "all",
      datePosted: "all",
      skills: "",
    };
    setFilters(clearedFilters);
    updateFilters(clearedFilters);
  };

  // Calculate filter counts
  const filterCounts = [
    { label: "All Internships", value: "all", count: counts.all || 0 },
    { label: "Tech", value: "tech", count: counts.tech || 0 },
    { label: "Data", value: "data", count: counts.data || 0 },
    { label: "Business", value: "business", count: counts.business || 0 },
    { label: "Remote", value: "remote", count: counts.remote || 0 },
    { label: "Paid", value: "paid", count: counts.paid || 0 },
    { label: "High Stipend", value: "high", count: counts.high || 0 },
    { label: "Quick Apply", value: "quick", count: counts.quick || 0 },
  ];

  const featuredInternships = internships.filter((i) => i.featured).slice(0, 3);

  const handleApplyClick = (internship) => {
    if (!user) {
      toast.error("Please login to apply for internships");
      router.push("/login");
      return;
    }
    
    setSelectedInternship(internship);
    setShowApplicationModal(true);
  };

  return (
    <>
      <div className="space-y-6">
        {/* Hero Section */}
        <div className="text-center py-6 sm:py-8 max-w-3xl mx-auto">
          <h1 className="text-4xl sm:text-5xl font-black mb-3 leading-tight tracking-tight text-slate-900 dark:text-white">
            Find Your Dream{" "}
            <span className="bg-linear-to-r from-blue-600 via-indigo-600 to-purple-600 dark:from-blue-400 dark:via-indigo-300 dark:to-purple-400 bg-clip-text text-transparent">
              Internship
            </span>
          </h1>
          <p className="text-slate-600 dark:text-slate-300 text-sm sm:text-base leading-relaxed">
            Discover verified internship opportunities from top companies. Gain real-world experience and accelerate your career.
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
                  type="text"
                  placeholder="Search internships by role, company, or skill..."
                  className="w-full pl-10 pr-4 py-3 bg-white/90 dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-700/80 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all shadow-xs"
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch(e)}
                />
              </div>

              {/* Location Select */}
              <div className="relative md:w-56">
                <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500 pointer-events-none" />
                <select 
                  className="w-full pl-10 pr-9 py-3 bg-white/90 dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-700/80 rounded-xl text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition-all appearance-none cursor-pointer shadow-xs"
                  value={filters.location}
                  onChange={(e) => handleFilterChange("location", e.target.value)}
                >
                  <option value="all">All Locations</option>
                  <option value="remote">Remote</option>
                  <option value="hybrid">Hybrid</option>
                  <option value="on-site">On-site</option>
                  {filterOptions.locations.map((loc) => (
                    <option key={loc} value={loc}>
                      {loc}
                    </option>
                  ))}
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
                      <span>Advanced Search Filters</span>
                    </div>
                    {activeAdvancedCount > 0 && (
                      <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/80 dark:border-indigo-800/60 font-semibold">
                        {activeAdvancedCount} filter{activeAdvancedCount > 1 ? "s" : ""} applied
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Internship Domain */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                        <Briefcase className="w-3.5 h-3.5 text-indigo-500" />
                        <span>Domain</span>
                      </label>
                      <div className="relative">
                        <select
                          className="w-full bg-white/95 dark:bg-slate-900/90 border border-slate-200/90 dark:border-slate-700/80 text-slate-900 dark:text-white pl-3.5 pr-8 py-2.5 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-500 transition-all appearance-none cursor-pointer shadow-xs"
                          value={filters.domain}
                          onChange={(event) => handleFilterChange("domain", event.target.value)}
                        >
                          <option value="all">All domains</option>
                          <option value="tech">Tech & Engineering</option>
                          <option value="data">Data & AI</option>
                          <option value="business">Business & Product</option>
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                      </div>
                    </div>

                    {/* Stipend Range */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                        <IndianRupee className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Stipend Range (₹ / Month)</span>
                      </label>
                      <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">₹</span>
                          <input
                            type="number"
                            min="0"
                            placeholder="Min"
                            className="w-full pl-6 pr-3 py-2.5 bg-white/95 dark:bg-slate-900/90 border border-slate-200/90 dark:border-slate-700/80 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-500 transition-all shadow-xs"
                            value={filters.stipendMin}
                            onChange={(event) => setFilters((current) => ({ ...current, stipendMin: event.target.value }))}
                          />
                        </div>
                        <span className="text-slate-400 font-medium text-xs">to</span>
                        <div className="relative flex-1">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400">₹</span>
                          <input
                            type="number"
                            min="0"
                            placeholder="Max"
                            className="w-full pl-6 pr-3 py-2.5 bg-white/95 dark:bg-slate-900/90 border border-slate-200/90 dark:border-slate-700/80 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-500 transition-all shadow-xs"
                            value={filters.stipendMax}
                            onChange={(event) => setFilters((current) => ({ ...current, stipendMax: event.target.value }))}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Duration */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-blue-500" />
                        <span>Duration</span>
                      </label>
                      <div className="relative">
                        <select
                          className="w-full bg-white/95 dark:bg-slate-900/90 border border-slate-200/90 dark:border-slate-700/80 text-slate-900 dark:text-white pl-3.5 pr-8 py-2.5 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-500 transition-all appearance-none cursor-pointer shadow-xs"
                          value={filters.duration}
                          onChange={(event) => handleFilterChange("duration", event.target.value)}
                        >
                          <option value="all">Any duration</option>
                          <option value="1-3">1–3 months</option>
                          <option value="3-6">3–6 months</option>
                          <option value="6-12">6–12 months</option>
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
                          value={filters.workMode}
                          onChange={(event) => handleFilterChange("workMode", event.target.value)}
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
                          value={filters.datePosted}
                          onChange={(event) => handleFilterChange("datePosted", event.target.value)}
                        >
                          <option value="all">Any time</option>
                          <option value="24h">Last 24 hours</option>
                          <option value="7d">Last 7 days</option>
                          <option value="30d">Last 30 days</option>
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                      </div>
                    </div>

                    {/* Skills Required */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-pink-500" />
                        <span>Skills Required</span>
                      </label>
                      <input
                        placeholder="e.g. React, Python, Node.js"
                        className="w-full bg-white/95 dark:bg-slate-900/90 border border-slate-200/90 dark:border-slate-700/80 text-slate-900 dark:text-white px-3.5 py-2.5 rounded-xl text-xs sm:text-sm placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/25 focus:border-indigo-500 transition-all shadow-xs"
                        value={filters.skills}
                        onChange={(event) => setFilters((current) => ({ ...current, skills: event.target.value }))}
                      />
                    </div>
                  </div>

                  {/* Drawer Footer Actions */}
                  <div className="flex items-center justify-between mt-5 pt-3.5 border-t border-slate-200/70 dark:border-slate-800/70">
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {activeAdvancedCount > 0 ? `${activeAdvancedCount} filter(s) applied` : "Tip: Combine filters to target specific opportunities"}
                    </span>
                    {activeAdvancedCount > 0 && (
                      <button
                        type="button"
                        onClick={clearAdvancedFilters}
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

        {/* Featured Internships */}
        {featuredInternships.length > 0 && (
          <section>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Featured Internships</h2>
              <Button 
                variant="ghost" 
                className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-semibold"
                onClick={() => handleFilterChange("type", "all")}
              >
                View All Featured →
              </Button>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <BouncingBalls size="md" label="Loading featured internships..." />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {featuredInternships.map((internship) => (
                  <InternshipCard 
                    key={internship.id} 
                    internship={internship}
                    onApply={() => handleApplyClick(internship)}
                  />
                ))}
              </div>
            )}
          </section>
        )}

        {/* Filter Bar */}
        <FilterBar 
          filters={filterCounts} 
          activeFilter={filters.type}
          onFilterChange={(value) => handleFilterChange("type", value)}
        />

        {/* All Internships */}
        <section>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
            <div className="flex items-center gap-3">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                All Internships
              </h2>
              {internships.length > 0 && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/80 dark:border-indigo-800/60 shadow-xs">
                  {internships.length}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 self-end sm:self-auto">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 hidden sm:inline">Sort:</span>
              <div className="relative">
                <select 
                  className="bg-white/90 dark:bg-slate-900/80 border border-slate-200/90 dark:border-slate-800/80 rounded-xl pl-3 pr-8 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/25 appearance-none cursor-pointer"
                  value={filters.sort}
                  onChange={(e) => handleFilterChange("sort", e.target.value)}
                >
                  <option value="deadline">Deadline</option>
                  <option value="stipend">Stipend (High to Low)</option>
                  <option value="popularity">Popularity</option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <BouncingBalls size="lg" label="Loading curated internships..." />
            </div>
          ) : internships.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {internships.map((internship) => (
                <InternshipCard 
                  key={internship.id} 
                  internship={internship}
                  onApply={() => handleApplyClick(internship)}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-16 premium-card-glass p-8">
              <h3 className="text-xl font-bold mb-2 text-slate-900 dark:text-white">No internships found</h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm max-w-md mx-auto">
                Try adjusting your filters or search terms to explore more opportunities.
              </p>
              <Button 
                className="mt-4 btn-theme-action px-6"
                onClick={clearFilters}
              >
                Clear All Filters
              </Button>
            </div>
          )}
        </section>

        {/* Tips Section */}
        <div className="premium-card-glass p-6 sm:p-8 shadow-md">
          <h2 className="text-xl sm:text-2xl font-bold mb-6 text-center text-slate-900 dark:text-white">Internship Application Tips</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="premium-inset-tile p-5 text-center">
              <div className="text-3xl mb-2 text-indigo-500 font-bold">⮎</div>
              <h3 className="font-semibold mb-1 text-slate-900 dark:text-white text-sm">Tailored Resume</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Customize for each application</p>
            </div>

            <div className="premium-inset-tile p-5 text-center">
              <div className="text-3xl mb-2 text-purple-500 font-bold">⬱</div>
              <h3 className="font-semibold mb-1 text-slate-900 dark:text-white text-sm">Project Portfolio</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Showcase relevant projects</p>
            </div>

            <div className="premium-inset-tile p-5 text-center">
              <div className="text-3xl mb-2 text-emerald-500 font-bold">⬴</div>
              <h3 className="font-semibold mb-1 text-slate-900 dark:text-white text-sm">Skill Development</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Learn required technologies</p>
            </div>

            <div className="premium-inset-tile p-5 text-center">
              <div className="text-3xl mb-2 text-blue-500 font-bold">◆</div>
              <h3 className="font-semibold mb-1 text-slate-900 dark:text-white text-sm">Network</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Connect with professionals</p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="premium-card-glass p-5 text-center shadow-xs">
            <div className="text-3xl font-extrabold text-indigo-600 dark:text-indigo-400">{internships.length}+</div>
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">Internships</div>
          </div>

          <div className="premium-card-glass p-5 text-center shadow-xs">
            <div className="text-3xl font-extrabold text-emerald-500">85%</div>
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">Placement Rate</div>
          </div>

          <div className="premium-card-glass p-5 text-center shadow-xs">
            <div className="text-3xl font-extrabold text-purple-600 dark:text-purple-400">
              {new Set(internships.map(i => i.company)).size}+
            </div>
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">Companies</div>
          </div>

          <div className="premium-card-glass p-5 text-center shadow-xs">
            <div className="text-3xl font-extrabold text-blue-600 dark:text-blue-400">50K+</div>
            <div className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">Students Placed</div>
          </div>
        </div>
      </div>

      {/* Application Modal */}
      {showApplicationModal && selectedInternship && (
        <ApplicationModal
          internship={selectedInternship}
          userId={user?.id}
          userEmail={user?.email}
          onClose={() => {
            setShowApplicationModal(false);
            setSelectedInternship(null);
          }}
        />
      )}
    </>
  );
}