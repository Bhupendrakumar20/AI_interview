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
        <div className="text-center py-8">
          <h1 className="text-5xl font-bold mb-4">Find Your Dream Internship</h1>
          <p className="text-light-100 text-lg max-w-3xl mx-auto">
            Discover internship opportunities from top companies. Gain real-world experience and kickstart your career.
          </p>
        </div>

        {/* Search Bar */}
        <div className="card-border">
          <div className="card p-4">
            <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4">
              <Input
                type="text"
                placeholder="Search internships by role, company, or skill..."
                className="flex-1 bg-dark-200 text-light-100 px-4 py-3 rounded-lg outline-none"
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                onKeyDown={(e) => e.key === "Enter" && handleSearch(e)}
              />
              <select 
                className="bg-dark-200 text-light-100 px-4 py-3 rounded-lg"
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
              <Button type="submit" className="btn-primary px-8">
                Search
              </Button>
            </form>
          </div>
        </div>

        <details className="card-border group">
          <summary className="card px-5 py-4 cursor-pointer font-semibold">
            Advanced Filters
          </summary>
          <div className="card p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <label className="space-y-2 text-sm text-light-100">
              <span>Internship Domain</span>
              <select
                className="w-full bg-dark-200 text-light-100 px-3 py-2 rounded-lg"
                value={filters.domain}
                onChange={(event) => handleFilterChange("domain", event.target.value)}
              >
                <option value="all">All domains</option>
                <option value="tech">Tech</option>
                <option value="data">Data</option>
                <option value="business">Business</option>
              </select>
            </label>

            <div className="space-y-2 text-sm text-light-100">
              <span>Stipend Range</span>
              <div className="flex gap-2">
                <Input
                  type="number"
                  min="0"
                  placeholder="Min"
                  value={filters.stipendMin}
                  onChange={(event) => setFilters((current) => ({ ...current, stipendMin: event.target.value }))}
                />
                <Input
                  type="number"
                  min="0"
                  placeholder="Max"
                  value={filters.stipendMax}
                  onChange={(event) => setFilters((current) => ({ ...current, stipendMax: event.target.value }))}
                />
              </div>
            </div>

            <label className="space-y-2 text-sm text-light-100">
              <span>Duration</span>
              <select
                className="w-full bg-dark-200 text-light-100 px-3 py-2 rounded-lg"
                value={filters.duration}
                onChange={(event) => handleFilterChange("duration", event.target.value)}
              >
                <option value="all">Any duration</option>
                <option value="1-3">1–3 months</option>
                <option value="3-6">3–6 months</option>
                <option value="6-12">6–12 months</option>
              </select>
            </label>

            <label className="space-y-2 text-sm text-light-100">
              <span>Work Mode</span>
              <select
                className="w-full bg-dark-200 text-light-100 px-3 py-2 rounded-lg"
                value={filters.workMode}
                onChange={(event) => handleFilterChange("workMode", event.target.value)}
              >
                <option value="all">All work modes</option>
                <option value="remote">Remote</option>
                <option value="hybrid">Hybrid</option>
                <option value="on-site">On-site</option>
              </select>
            </label>

            <label className="space-y-2 text-sm text-light-100">
              <span>Date Posted</span>
              <select
                className="w-full bg-dark-200 text-light-100 px-3 py-2 rounded-lg"
                value={filters.datePosted}
                onChange={(event) => handleFilterChange("datePosted", event.target.value)}
              >
                <option value="all">Any time</option>
                <option value="24h">Last 24 hours</option>
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
              </select>
            </label>

            <label className="space-y-2 text-sm text-light-100">
              <span>Skills Required</span>
              <Input
                placeholder="e.g. React, Python"
                value={filters.skills}
                onChange={(event) => setFilters((current) => ({ ...current, skills: event.target.value }))}
              />
            </label>
            <div className="sm:col-span-2 lg:col-span-3 flex justify-end">
              <Button type="button" variant="outline" onClick={clearAdvancedFilters}>
                Clear Advanced Filters
              </Button>
            </div>
          </div>
        </details>

        {/* Featured Internships */}
        {featuredInternships.length > 0 && (
          <section>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-3xl font-bold">Featured Internships</h2>
              <Button 
                variant="ghost" 
                className="text-primary-200"
                onClick={() => handleFilterChange("type", "all")}
              >
                View All Featured
              </Button>
            </div>

            {loading ? (
              <div className="text-center py-10">Loading featured internships...</div>
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
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-3xl font-bold">
              All Internships {internships.length > 0 && `(${internships.length})`}
            </h2>
            <div className="flex gap-2">
              <select 
                className="bg-dark-200 text-light-100 px-3 py-2 rounded-lg"
                value={filters.sort}
                onChange={(e) => handleFilterChange("sort", e.target.value)}
              >
                <option value="deadline">Sort by: Deadline</option>
                <option value="stipend">Sort by: Stipend</option>
                <option value="popularity">Sort by: Popularity</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-20">Loading internships...</div>
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
            <div className="text-center py-20 card-border">
              <div className="card p-8">
                <h3 className="text-xl font-bold mb-2">No internships found</h3>
                <p className="text-light-100">
                  Try adjusting your filters or search terms
                </p>
                <Button 
                  className="mt-4"
                  onClick={clearFilters}
                >
                  Clear All Filters
                </Button>
              </div>
            </div>
          )}
        </section>

        {/* Tips Section */}
        <div className="card-border">
          <div className="card p-8">
            <h2 className="text-2xl font-bold mb-6 text-center">Internship Application Tips</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="text-3xl mb-3">⮎</div>
                <h3 className="font-semibold mb-2">Tailored Resume</h3>
                <p className="text-sm text-light-100">Customize for each application</p>
              </div>

              <div className="text-center">
                <div className="text-3xl mb-3">⬱</div>
                <h3 className="font-semibold mb-2">Project Portfolio</h3>
                <p className="text-sm text-light-100">Showcase relevant projects</p>
              </div>

              <div className="text-center">
                <div className="text-3xl mb-3">⬴</div>
                <h3 className="font-semibold mb-2">Skill Development</h3>
                <p className="text-sm text-light-100">Learn required technologies</p>
              </div>

              <div className="text-center">
                <div className="text-3xl mb-3">◆</div>
                <h3 className="font-semibold mb-2">Network</h3>
                <p className="text-sm text-light-100">Connect with professionals</p>
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="card-border">
            <div className="card p-5 text-center">
              <div className="text-3xl font-bold text-primary-200">{internships.length}+</div>
              <div className="text-light-100">Internships</div>
            </div>
          </div>

          <div className="card-border">
            <div className="card p-5 text-center">
              <div className="text-3xl font-bold text-success-100">85%</div>
              <div className="text-light-100">Placement Rate</div>
            </div>
          </div>

          <div className="card-border">
            <div className="card p-5 text-center">
              <div className="text-3xl font-bold">
                {new Set(internships.map(i => i.company)).size}+
              </div>
              <div className="text-light-100">Companies</div>
            </div>
          </div>

          <div className="card-border">
            <div className="card p-5 text-center">
              <div className="text-3xl font-bold">50K+</div>
              <div className="text-light-100">Students Placed</div>
            </div>
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