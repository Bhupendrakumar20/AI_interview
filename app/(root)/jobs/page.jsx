"use client";

import { useEffect, useState } from "react";
import JobCard from "@/components/JobCard";
import { fetchJobs } from "@/lib/actions/jobs.action";

export default function JobsPage() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [source, setSource] = useState(""); // Track if data is from API or fallback

  useEffect(() => {
    async function loadJobs() {
      try {
        setLoading(true);
        const result = await fetchJobs("developer jobs", {
          page: 1,
          country: "us",
          date_posted: "all",
          useFallback: true,
        });

        if (result.success) {
          setJobs(result.jobs);
          setSource(result.source);
          if (result.error) {
            console.warn("Jobs API warning:", result.error);
          }
        } else {
          setError(result.error);
          setJobs([]);
        }
      } catch (err) {
        console.error("Failed to load jobs:", err);
        setError("Failed to load jobs. Please try again later.");
      } finally {
        setLoading(false);
      }
    }

    loadJobs();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-bold mb-2">Job Opportunities</h1>
        <p className="text-light-100">
          Find your dream job from top tech companies
        </p>
        {source === "fallback" && (
          <p className="text-sm text-yellow-500 mt-2">
            Showing sample jobs (API temporarily unavailable)
          </p>
        )}
        {source === "api" && (
          <p className="text-sm text-green-500 mt-2">✅ Live job listings</p>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-200"></div>
        </div>
      ) : error ? (
        <div className="bg-red-500/10 border border-red-500 text-red-300 p-4 rounded-lg">
          {error}
        </div>
      ) : jobs.length === 0 ? (
        <div className="bg-dark-200 border border-dark-300 p-8 rounded-lg text-center text-light-100">
          No jobs found. Please try again later.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {jobs.map((job) => (
            <JobCard key={job.id} job={job} />
          ))}
        </div>
      )}
    </div>
  );
}