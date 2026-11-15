"use server";

import { aggregateJobs } from "@/lib/jobs/services/jobAggregator.js";

function getTimeAgo(date) {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `${weeks}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

async function fetchWithTimeout(resource, { timeout = 15000, ...options } = {}) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  try {
    return await fetch(resource, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
}

function transformJob(job) {
  const highlights = job.job_highlights;
  const skills = Array.isArray(highlights)
    ? highlights
    : typeof highlights === "string"
      ? [highlights]
      : highlights && typeof highlights === "object"
        ? Object.values(highlights).filter((value) => typeof value === "string")
        : [];

  return {
    id: job.job_id,
    title: job.job_title || "Job Title",
    company: job.employer_name || "Company",
    location: job.job_city
      ? `${job.job_city}${job.job_state ? `, ${job.job_state}` : ""}`
      : job.job_location || "Remote",
    salary: job.job_max_salary
      ? `$${job.job_min_salary || 0} - $${job.job_max_salary}`
      : "Competitive",
    experience: job.job_required_experience?.required_experience_in_years
      ? `${job.job_required_experience.required_experience_in_years}+ years`
      : "Experience required",
    type: job.job_employment_type || "Full-time",
    posted: job.job_posted_at_datetime_utc
      ? getTimeAgo(new Date(job.job_posted_at_datetime_utc))
      : "Recently",
    skills,
    description: job.job_description || "",
    url: job.job_apply_link || "#",
  };
}

export async function fetchJobs(searchQuery = "developer jobs", options = {}) {
  const { page = 1, country = "us", limit = 20, type = "job", location = "" } = options;
  const result = await aggregateJobs({
    query: searchQuery,
    page,
    country,
    limit,
    type,
    location,
  });

  const jobs = result.jobs.map((job) => ({
    ...job,
    salary: job.stipend,
    experience: job.experience || "Not specified",
    posted: job.postedDate ? getTimeAgo(new Date(job.postedDate)) : "Recently",
    url: job.applyLink,
  }));

  return { ...result, jobs };
}

export async function fetchJobById(jobId) {
  if (!process.env.JSEARCH_API_KEY) {
    return { success: false, job: null, error: "JSEARCH_API_KEY is not configured" };
  }

  try {
    const url = new URL("https://jsearch.p.rapidapi.com/jobs");
    url.searchParams.set("job_id", jobId);

    const response = await fetchWithTimeout(url, {
      headers: {
        "x-rapidapi-key": process.env.JSEARCH_API_KEY,
        "x-rapidapi-host": "jsearch.p.rapidapi.com",
      },
    });

    if (!response.ok) {
      throw new Error(`JSearch HTTP ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    if (!Array.isArray(data.data) || data.data.length === 0) {
      throw new Error("Job not found");
    }

    return { success: true, job: transformJob(data.data[0]), source: "api" };
  } catch (error) {
    console.error("Error fetching job details:", error);
    return {
      success: false,
      job: null,
      error: error instanceof Error ? error.message : "Unable to fetch job details",
    };
  }
}

export async function fetchInternshipsFromAPI(options = {}) {
  const {
    searchTerm = "internship developer",
    location = "all",
    page = 1,
    country,
  } = options;

  return aggregateJobs({
    query: searchTerm,
    location,
    page,
    country,
    type: "internship",
  });
}
