// app/(root)/internships/page.jsx

"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import InternshipCard from "@/components/InternshipCard";
import FilterBar from "@/components/FilterBar";
import ApplicationModal from "@/components/ApplicationModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { searchInternships, getInternshipCounts } from "@/lib/actions/general.action";
import { searchInternshipsJSearch } from "@/lib/actions/jsearch.action";
import { getCurrentUser } from "@/lib/actions/auth.action";
import { toast } from "sonner";

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
  
  const [filters, setFilters] = useState({
    search: "",
    location: "all",
    type: "all",
    sort: "deadline",
  });

  // Initialize filters from URL params
  useEffect(() => {
    const type = searchParams.get("type") || "all";
    const search = searchParams.get("search") || "";
    const location = searchParams.get("location") || "all";
    const sort = searchParams.get("sort") || "deadline";

    setFilters({
      search,
      location,
      type,
      sort,
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
      // Build search query
      let searchQuery = filters.search || "internship";
      
      // Fetch from JSearch API
      const apiResult = await searchInternshipsJSearch({
        searchTerm: searchQuery,
        location: filters.location === "all" ? "" : filters.location,
        type: filters.type === "all" ? "internship" : filters.type,
        page: 1,
      });

      let allInternships = apiResult.internships || [];

      // Fallback to Firebase if JSearch returns empty
      if (allInternships.length === 0) {
        console.log("JSearch returned no results, falling back to Firebase");
        const firebaseData = await searchInternships({
          type: filters.type === "all" ? null : filters.type,
          location: filters.location === "all" ? null : filters.location,
          search: filters.search,
          limit: 50,
        });
        allInternships = firebaseData || [];
      } else {
        // Apply additional filters locally if JSearch has data
        if (filters.search) {
          const searchLower = filters.search.toLowerCase();
          allInternships = allInternships.filter(
            (item) =>
              item.title?.toLowerCase().includes(searchLower) ||
              item.company?.toLowerCase().includes(searchLower) ||
              item.description?.toLowerCase().includes(searchLower) ||
              item.skills?.some((skill) =>
                skill.toLowerCase().includes(searchLower)
              )
          );
        }

        if (filters.location !== "all" && filters.location !== "remote") {
          allInternships = allInternships.filter((item) => {
            return item.location?.toLowerCase().includes(filters.location.toLowerCase());
          });
        } else if (filters.location === "remote") {
          allInternships = allInternships.filter((item) => item.isRemote);
        }
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

      // Load filter options if not loaded
      if (Object.keys(counts).length === 0) {
        const countsData = await getInternshipCounts();
        setCounts(countsData);
      }
    } catch (error) {
      console.error("Error loading internships:", error);
      toast.error("Failed to load internships");
      setInternships([]);
    } finally {
      setLoading(false);
    }
  }, [filters, counts]);

  // Load data when filters change
  useEffect(() => {
    loadInternships();
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

  // Calculate filter counts
  const filterCounts = [
    { label: "All", value: "all", count: counts.all || 0 },
    { label: "Tech", value: "tech", count: counts.tech || 0 },
    { label: "Data", value: "data", count: counts.data || 0 },
    { label: "Business", value: "business", count: counts.business || 0 },
    { label: "Quick", value: "quick", count: counts.quick || 0 },
    { label: "Remote", value: "remote", count: counts.remote || 0 },
    { label: "High Stipend", value: "high", count: counts.high || 0 },
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
                  onClick={() => {
                    setFilters({ search: "", location: "all", type: "all", sort: "deadline" });
                    updateFilters({ search: "", location: "all", type: "all", sort: "deadline" });
                  }}
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