"use client";

import { useState, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import CompanyListingCard from "@/components/CompanyListingCard";
import { getAllCompanies } from "@/lib/companies-data";
import { paginate, getPageNumbers } from "@/lib/pagination";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";

const ITEMS_PER_PAGE = 6;

export default function CompaniesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentPageFromUrl = parseInt(searchParams.get("page") || "1");

  const [searchQuery, setSearchQuery] = useState("");
  
  const companies = getAllCompanies();

  // Filter companies based on search
  const filteredCompanies = useMemo(() => {
    if (!searchQuery.trim()) return companies;
    
    return companies.filter((company) =>
      company.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      company.positions.some((pos) =>
        pos.title.toLowerCase().includes(searchQuery.toLowerCase())
      )
    );
  }, [searchQuery, companies]);

  // Paginate filtered results
  const paginationResult = paginate(
    filteredCompanies,
    currentPageFromUrl,
    ITEMS_PER_PAGE
  );

  const pageNumbers = getPageNumbers(
    paginationResult.currentPage,
    paginationResult.totalPages,
    10
  );

  const handlePageChange = (page) => {
    router.push(`?page=${page}`, { scroll: true });
  };

  const handleSearch = (value) => {
    setSearchQuery(value);
    router.push("?page=1", { scroll: false });
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <section className="text-center">
        <h1 className="text-4xl font-bold mb-2 bg-linear-to-r from-primary-100 to-primary-200 bg-clip-text text-transparent">
          Interview Practice
        </h1>
        <p className="text-light-100 text-lg max-w-2xl mx-auto">
          Browse top companies and practice real interview questions with our AI interviewer
        </p>
      </section>

      {/* Search Bar */}
      <section className="max-w-2xl mx-auto w-full">
        <div className="card-border">
          <div className="card p-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 text-light-200" size={20} />
              <Input
                type="text"
                placeholder="Search companies or positions..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10 py-2 bg-light-300 border-light-200 text-light-900 placeholder-light-100"
              />
            </div>
            {searchQuery && (
              <p className="text-sm text-light-100 mt-2">
                Found {filteredCompanies.length} result{filteredCompanies.length !== 1 ? "s" : ""} for "{searchQuery}"
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Companies Grid */}
      <section>
        {paginationResult.items.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginationResult.items.map((company) => (
              <CompanyListingCard key={company.id} company={company} />
            ))}
          </div>
        ) : (
          <div className="card-border text-center py-12">
            <div className="card p-8">
              <p className="text-light-100 mb-4">
                No companies found matching your search.
              </p>
              <Button
                onClick={() => handleSearch("")}
                className="bg-primary-200 hover:bg-primary-100 text-white"
              >
                Clear Search
              </Button>
            </div>
          </div>
        )}
      </section>

      {/* Pagination */}
      {paginationResult.totalPages > 1 && (
        <section className="flex justify-center items-center gap-2 flex-wrap">
          {/* Previous Button */}
          <Button
            onClick={() => handlePageChange(paginationResult.currentPage - 1)}
            disabled={!paginationResult.hasPreviousPage}
            className="disabled:opacity-50 disabled:cursor-not-allowed bg-light-400 hover:bg-light-300 text-light-900"
            size="sm"
          >
            <ChevronLeft size={18} />
          </Button>

          {/* First Page (if not visible) */}
          {!pageNumbers.includes(1) && (
            <>
              <Button
                onClick={() => handlePageChange(1)}
                size="sm"
                className="bg-light-400 hover:bg-light-300 text-light-900"
              >
                1
              </Button>
              <span className="text-light-100">...</span>
            </>
          )}

          {/* Page Numbers */}
          {pageNumbers.map((pageNum) => (
            <Button
              key={pageNum}
              onClick={() => handlePageChange(pageNum)}
              size="sm"
              className={
                pageNum === paginationResult.currentPage
                  ? "bg-primary-200 text-white hover:bg-primary-100"
                  : "bg-light-400 text-light-900 hover:bg-light-300"
              }
            >
              {pageNum}
            </Button>
          ))}

          {/* Last Page (if not visible) */}
          {!pageNumbers.includes(paginationResult.totalPages) && (
            <>
              <span className="text-light-100">...</span>
              <Button
                onClick={() => handlePageChange(paginationResult.totalPages)}
                size="sm"
                className="bg-light-400 hover:bg-light-300 text-light-900"
              >
                {paginationResult.totalPages}
              </Button>
            </>
          )}

          {/* Next Button */}
          <Button
            onClick={() => handlePageChange(paginationResult.currentPage + 1)}
            disabled={!paginationResult.hasNextPage}
            className="disabled:opacity-50 disabled:cursor-not-allowed bg-light-400 hover:bg-light-300 text-light-900"
            size="sm"
          >
            <ChevronRight size={18} />
          </Button>
        </section>
      )}

      {/* Info Footer */}
      <section className="text-center text-sm text-light-100">
        <p>
          Showing {(paginationResult.currentPage - 1) * ITEMS_PER_PAGE + 1} to{" "}
          {Math.min(
            paginationResult.currentPage * ITEMS_PER_PAGE,
            paginationResult.totalItems
          )}{" "}
          of {paginationResult.totalItems} companies
        </p>
      </section>
    </div>
  );
}
