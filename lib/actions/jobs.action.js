"use server";

// Dummy fallback data in case API fails
const DUMMY_JOBS = [
  {
    id: 1,
    title: "Senior Frontend Engineer",
    company: "Netflix",
    location: "Los Gatos, CA",
    salary: "$180,000 - $250,000",
    experience: "5+ years",
    type: "Full-time",
    posted: "2 days ago",
    skills: ["React", "TypeScript", "Next.js", "GraphQL"],
  },
  {
    id: 2,
    title: "Backend Developer",
    company: "Stripe",
    location: "San Francisco, CA",
    salary: "$160,000 - $220,000",
    experience: "3+ years",
    type: "Full-time",
    posted: "1 week ago",
    skills: ["Node.js", "Python", "AWS", "PostgreSQL"],
  },
  {
    id: 3,
    title: "Machine Learning Engineer",
    company: "OpenAI",
    location: "Remote",
    salary: "$200,000 - $300,000",
    experience: "4+ years",
    type: "Full-time",
    posted: "3 days ago",
    skills: ["Python", "PyTorch", "TensorFlow", "MLOps"],
  },
  {
    id: 4,
    title: "DevOps Engineer",
    company: "GitHub",
    location: "Remote",
    salary: "$150,000 - $200,000",
    experience: "3+ years",
    type: "Full-time",
    posted: "1 day ago",
    skills: ["Kubernetes", "Docker", "AWS", "CI/CD"],
  },
  {
    id: 5,
    title: "Product Designer",
    company: "Figma",
    location: "San Francisco, CA",
    salary: "$140,000 - $190,000",
    experience: "4+ years",
    type: "Full-time",
    posted: "5 days ago",
    skills: ["Figma", "UI/UX", "Prototyping", "Design Systems"],
  },
];

// Transform JSearch API response to our format
function transformJobsData(apiJobs) {
  if (!apiJobs || !Array.isArray(apiJobs)) return [];

  return apiJobs.map((job, index) => {
    // Ensure skills is always an array
    let skills = [];
    if (job.job_highlights) {
      if (Array.isArray(job.job_highlights)) {
        skills = job.job_highlights;
      } else if (typeof job.job_highlights === "string") {
        skills = [job.job_highlights];
      } else if (typeof job.job_highlights === "object") {
        skills = Object.values(job.job_highlights).filter(s => typeof s === "string");
      }
    }

    return {
      id: job.job_id || index + 1,
      title: job.job_title || "Job Title",
      company: job.employer_name || "Company",
      location: job.job_city
        ? `${job.job_city}${job.job_state ? ", " + job.job_state : ""}`
        : "Remote",
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
      skills: skills,
      description: job.job_description || "",
      url: job.job_apply_link || "#",
    };
  });
}

// Helper function to format time
function getTimeAgo(date) {
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);

  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `${weeks}w ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

export async function fetchJobs(searchQuery = "developer jobs", options = {}) {
  const {
    page = 1,
    country = "us",
    date_posted = "all",
    useFallback = true,
  } = options;

  try {
    console.log("Fetching jobs from JSearch API...");

    const url = new URL("https://jsearch.p.rapidapi.com/search");
    url.searchParams.append("query", searchQuery);
    url.searchParams.append("page", page);
    url.searchParams.append("num_pages", 1);
    url.searchParams.append("country", country);
    url.searchParams.append("date_posted", date_posted);

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "x-rapidapi-key": process.env.JSEARCH_API_KEY,
        "x-rapidapi-host": "jsearch.p.rapidapi.com",
      },
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (data.data && Array.isArray(data.data)) {
      const transformedJobs = transformJobsData(data.data);
      console.log(`Successfully fetched ${transformedJobs.length} jobs`);
      return {
        success: true,
        jobs: transformedJobs,
        source: "api",
        totalResults: data.data.length,
      };
    } else {
      throw new Error("Invalid API response format");
    }
  } catch (error) {
    console.error("Error fetching jobs from API:", error);

    if (useFallback) {
      console.log("Using fallback dummy data");
      return {
        success: true,
        jobs: DUMMY_JOBS,
        source: "fallback",
        error: error.message,
      };
    } else {
      return {
        success: false,
        jobs: [],
        source: "none",
        error: error.message,
      };
    }
  }
}

export async function fetchJobById(jobId) {
  try {
    const url = new URL("https://jsearch.p.rapidapi.com/jobs");
    url.searchParams.append("job_id", jobId);

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "x-rapidapi-key": process.env.JSEARCH_API_KEY,
        "x-rapidapi-host": "jsearch.p.rapidapi.com",
      },
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (data.data && data.data.length > 0) {
      const job = transformJobsData([data.data[0]])[0];
      return { success: true, job, source: "api" };
    } else {
      throw new Error("Job not found");
    }
  } catch (error) {
    console.error("Error fetching job details:", error);
    return {
      success: false,
      job: null,
      error: error.message,
    };
  }
}

// Transform RapidAPI Internships response to our format
function transformInternshipsData(apiInternships) {
  if (!apiInternships || !Array.isArray(apiInternships)) return [];

  return apiInternships.map((internship, index) => ({
    id: internship.id || `internship-${index + 1}`,
    title: internship.title || internship.Job_Title || "Internship Position",
    company: internship.company || internship.Company_Name || "Company",
    location: internship.location || internship.Location || "Remote",
    stipend: internship.stipend || internship.Stipend || "Not specified",
    duration: internship.duration || internship.Duration || "Not specified",
    type: internship.type || "Internship",
    postedAt: internship.posted_at || internship.postedAt || new Date().toISOString(),
    deadline: internship.deadline || internship.Deadline || null,
    description: internship.description || internship.Description || "",
    skills: internship.skills || internship.Skills || [],
    applicants: internship.applicants || 0,
    featured: internship.featured || false,
    isRemote: (internship.location || internship.Location || "").toLowerCase().includes("remote") || internship.isRemote === true,
    url: internship.url || internship.apply_link || "#",
  }));
}

export async function fetchInternshipsFromAPI(options = {}) {
  const {
    useFallback = true,
  } = options;

  try {
    console.log("Fetching internships from RapidAPI...");

    const url = "https://internships-api.p.rapidapi.com/active-jb-7d";

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "x-rapidapi-key": process.env.INTERNSHIPS_API_KEY,
        "x-rapidapi-host": process.env.INTERNSHIPS_API_HOST,
      },
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    // Handle different response formats
    let internships = [];
    
    if (Array.isArray(data)) {
      internships = transformInternshipsData(data);
    } else if (data.data && Array.isArray(data.data)) {
      internships = transformInternshipsData(data.data);
    } else if (data.internships && Array.isArray(data.internships)) {
      internships = transformInternshipsData(data.internships);
    } else {
      throw new Error("Invalid API response format");
    }

    console.log(`Successfully fetched ${internships.length} internships`);
    return {
      success: true,
      internships: internships,
      source: "api",
      totalResults: internships.length,
    };
  } catch (error) {
    console.error("Error fetching internships from API:", error);

    if (useFallback) {
      console.log("API call failed, returning empty array (will use Firebase data)");
      return {
        success: false,
        internships: [],
        source: "none",
        error: error.message,
      };
    } else {
      return {
        success: false,
        internships: [],
        source: "none",
        error: error.message,
      };
    }
  }
}
