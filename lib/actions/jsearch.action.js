"use server";

const JSEARCH_API_KEY = "0ee7d803a5mshed14d2f75a69acep1ffa7cjsncc7655a1429b";
const JSEARCH_API_HOST = "jsearch.p.rapidapi.com";

// Helper for fetching with a timeout
async function fetchWithTimeout(resource, options = {}) {
  const { timeout = 15000 } = options;
  
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(resource, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
}

/**
 * Fallback internship data (used when API doesn't respond)
 * Priority: 2
 */
const FALLBACK_INTERNSHIPS = [
  {
    id: "fallback-1",
    title: "Frontend Developer Internship",
    company: "Google",
    location: "Mountain View, CA",
    isRemote: false,
    stipend: "USD 7500",
    duration: "3 months",
    description: "Build amazing user interfaces with React and TypeScript. Work on projects used by millions.",
    type: "Internship",
    applyLink: "https://careers.google.com/internships",
    url: "https://careers.google.com/internships",
    postedDate: new Date().toISOString(),
    deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    skills: ["React", "JavaScript", "TypeScript", "CSS", "Node.js"],
    applicants: 1250,
    badge: "Verified",
  },
  {
    id: "fallback-2",
    title: "Backend Developer Internship",
    company: "Microsoft",
    location: "Remote",
    isRemote: true,
    stipend: "USD 8000",
    duration: "3 months",
    description: "Develop scalable backend services using Python, Java, or C#. Work on cloud infrastructure.",
    type: "Internship",
    applyLink: "https://careers.microsoft.com/internships",
    url: "https://careers.microsoft.com/internships",
    postedDate: new Date().toISOString(),
    deadline: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000).toISOString(),
    skills: ["Python", "Java", "AWS", "Docker", "SQL"],
    applicants: 980,
    badge: "Verified",
  },
  {
    id: "fallback-3",
    title: "Full Stack Developer Internship",
    company: "Amazon",
    location: "Seattle, WA",
    isRemote: false,
    stipend: "USD 9000",
    duration: "4 months",
    description: "Work on full stack projects using modern web technologies. Collaborate with experienced engineers.",
    type: "Internship",
    applyLink: "https://www.amazon.jobs/internships",
    url: "https://www.amazon.jobs/internships",
    postedDate: new Date().toISOString(),
    deadline: new Date(Date.now() + 35 * 24 * 60 * 60 * 1000).toISOString(),
    skills: ["React", "Node.js", "JavaScript", "AWS", "SQL"],
    applicants: 1500,
    badge: "Verified",
  },
  {
    id: "fallback-4",
    title: "Data Science Internship",
    company: "Facebook",
    location: "Menlo Park, CA",
    isRemote: false,
    stipend: "USD 8500",
    duration: "3 months",
    description: "Work with large datasets and build machine learning models to improve user experiences.",
    type: "Internship",
    applyLink: "https://www.facebook.com/careers/internships",
    url: "https://www.facebook.com/careers/internships",
    postedDate: new Date().toISOString(),
    deadline: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString(),
    skills: ["Python", "SQL", "Machine Learning", "Statistics", "TensorFlow"],
    applicants: 750,
    badge: "Verified",
  },
  {
    id: "fallback-5",
    title: "Product Manager Internship",
    company: "Apple",
    location: "Cupertino, CA",
    isRemote: false,
    stipend: "USD 7800",
    duration: "3 months",
    description: "Drive product strategy and work directly with engineers and designers to ship amazing products.",
    type: "Internship",
    applyLink: "https://www.apple.com/careers/internships",
    url: "https://www.apple.com/careers/internships",
    postedDate: new Date().toISOString(),
    deadline: new Date(Date.now() + 28 * 24 * 60 * 60 * 1000).toISOString(),
    skills: ["Product Management", "Analytics", "Communication", "SQL", "User Research"],
    applicants: 620,
    badge: "Verified",
  },
  {
    id: "fallback-6",
    title: "DevOps Engineer Internship",
    company: "Netflix",
    location: "Remote",
    isRemote: true,
    stipend: "USD 8200",
    duration: "4 months",
    description: "Build and maintain infrastructure that powers Netflix's streaming platform for millions of users.",
    type: "Internship",
    applyLink: "https://jobs.netflix.com/internships",
    url: "https://jobs.netflix.com/internships",
    postedDate: new Date().toISOString(),
    deadline: new Date(Date.now() + 32 * 24 * 60 * 60 * 1000).toISOString(),
    skills: ["Kubernetes", "Docker", "AWS", "CI/CD", "Linux"],
    applicants: 580,
    badge: "Verified",
  },
  {
    id: "fallback-7",
    title: "Mobile App Developer Internship",
    company: "Uber",
    location: "San Francisco, CA",
    isRemote: false,
    stipend: "USD 8700",
    duration: "3 months",
    description: "Build iOS and Android apps for millions of Uber users worldwide.",
    type: "Internship",
    applyLink: "https://www.uber.com/careers/internships",
    url: "https://www.uber.com/careers/internships",
    postedDate: new Date().toISOString(),
    deadline: new Date(Date.now() + 22 * 24 * 60 * 60 * 1000).toISOString(),
    skills: ["Swift", "Kotlin", "React Native", "JavaScript", "Java"],
    applicants: 890,
    badge: "Verified",
  },
  {
    id: "fallback-8",
    title: "AI/ML Engineer Internship",
    company: "OpenAI",
    location: "Remote",
    isRemote: true,
    stipend: "USD 9500",
    duration: "4 months",
    description: "Research and develop cutting-edge artificial intelligence models.",
    type: "Internship",
    applyLink: "https://openai.com/careers/internships",
    url: "https://openai.com/careers/internships",
    postedDate: new Date().toISOString(),
    deadline: new Date(Date.now() + 18 * 24 * 60 * 60 * 1000).toISOString(),
    skills: ["Python", "PyTorch", "TensorFlow", "Machine Learning", "Deep Learning"],
    applicants: 420,
    badge: "Verified",
  },
  {
    id: "fallback-9",
    title: "Security Engineer Internship",
    company: "Stripe",
    location: "San Francisco, CA",
    isRemote: false,
    stipend: "USD 8400",
    duration: "3 months",
    description: "Work on security infrastructure and protect millions of payment transactions.",
    type: "Internship",
    applyLink: "https://stripe.com/careers/internships",
    url: "https://stripe.com/careers/internships",
    postedDate: new Date().toISOString(),
    deadline: new Date(Date.now() + 26 * 24 * 60 * 60 * 1000).toISOString(),
    skills: ["Security", "Python", "Linux", "Network Security", "Cryptography"],
    applicants: 510,
    badge: "Verified",
  },
  {
    id: "fallback-10",
    title: "Cloud Architecture Internship",
    company: "Twitter",
    location: "Remote",
    isRemote: true,
    stipend: "USD 7900",
    duration: "3 months",
    description: "Design and optimize cloud infrastructure for Twitter's distributed systems.",
    type: "Internship",
    applyLink: "https://twitter.com/careers/internships",
    url: "https://twitter.com/careers/internships",
    postedDate: new Date().toISOString(),
    deadline: new Date(Date.now() + 29 * 24 * 60 * 60 * 1000).toISOString(),
    skills: ["GCP", "Kubernetes", "Terraform", "Python", "Go"],
    applicants: 440,
    badge: "Verified",
  },
];

/**
 * Fetch internships from JSearch API
 * @param {Object} params - Search parameters
 * @param {string} params.query - Search query (e.g., "internship developer")
 * @param {string} params.location - Location filter (e.g., "remote", "chicago")
 * @param {string} params.page - Page number (default: 1)
 * @param {string} params.num_pages - Number of pages to return (default: 1)
 * @returns {Promise<Object>} - Internship results
 */
export async function fetchInternshipsFromJSearch({
  query = "internship developer",
  location = "",
  page = 1,
  num_pages = 1,
} = {}) {
  try {
    // Build the search query
    let searchQuery = query;
    if (location && location !== "all" && location !== "remote") {
      searchQuery = `${query} in ${location}`;
    } else if (location === "remote") {
      searchQuery = `${query} remote`;
    }

    const encodedQuery = encodeURIComponent(searchQuery);
    const apiUrl = `https://jsearch.p.rapidapi.com/search?query=${encodedQuery}&page=${page}&num_pages=${num_pages}&country=us&date_posted=all`;

    const response = await fetchWithTimeout(apiUrl, {
      method: "GET",
      headers: {
        "x-rapidapi-key": JSEARCH_API_KEY,
        "x-rapidapi-host": JSEARCH_API_HOST,
      },
      timeout: 15000
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();

    if (!data.data || !Array.isArray(data.data) || data.data.length === 0) {
      console.log("JSearch API returned no results, using fallback data");
      return {
        success: true,
        internships: filterFallbackInternships(query, location),
        totalResults: FALLBACK_INTERNSHIPS.length,
        source: "fallback",
      };
    }

    // Transform JSearch API response to internship format
    const internships = data.data.map((job) => ({
      id: job.job_id,
      title: job.job_title,
      company: job.employer_name,
      location: job.job_location || "Remote",
      isRemote: job.job_is_remote === true,
      stipend: job.job_salary_currency_code
        ? `${job.job_salary_currency_code} ${job.job_min_salary || "Competitive"}`
        : "Competitive",
      duration: job.job_employment_type || "Not specified",
      description: job.job_description || "",
      type: job.job_employment_type || "Full-time",
      applyLink: job.job_apply_link, // Direct apply link
      url: job.job_apply_link, // Fallback
      postedDate: job.job_posted_at_datetime_utc,
      deadline: job.job_offer_expiration_datetime_utc,
      skills: job.job_required_skills || [],
      applicants: 0,
      badge: job.employer_logo ? "Verified" : null,
    }));

    console.log(`Successfully fetched ${internships.length} internships from JSearch`);
    return {
      success: true,
      internships,
      totalResults: data.data.length,
      source: "jsearch",
    };
  } catch (error) {
    console.error("Error fetching internships from JSearch:", error);
    console.log("Falling back to local internship data (Priority 2)");
    
    // Fallback to local data when API fails
    return {
      success: true,
      internships: FALLBACK_INTERNSHIPS,
      totalResults: FALLBACK_INTERNSHIPS.length,
      error: error.message,
      source: "fallback",
    };
  }
}

/**
 * Filter fallback internships by query and location
 */
function filterFallbackInternships(query = "", location = "") {
  let filtered = [...FALLBACK_INTERNSHIPS];

  // Filter by query
  if (query) {
    const queryLower = query.toLowerCase();
    filtered = filtered.filter(
      (internship) =>
        internship.title.toLowerCase().includes(queryLower) ||
        internship.company.toLowerCase().includes(queryLower) ||
        internship.description.toLowerCase().includes(queryLower) ||
        internship.skills.some((skill) => skill.toLowerCase().includes(queryLower))
    );
  }

  // Filter by location
  if (location && location !== "all") {
    if (location === "remote") {
      filtered = filtered.filter((internship) => internship.isRemote);
    } else {
      filtered = filtered.filter((internship) =>
        internship.location.toLowerCase().includes(location.toLowerCase())
      );
    }
  }

  return filtered;
}

/**
 * Search internships with filters
 */
export async function searchInternshipsJSearch({
  searchTerm = "internship",
  location = "all",
  type = "internship",
  page = 1,
} = {}) {
  try {
    let query = searchTerm || "internship";

    const result = await fetchInternshipsFromJSearch({
      query: `${query} ${type}`,
      location,
      page,
      num_pages: 1,
    });

    return result;
  } catch (error) {
    console.error("Error searching internships on JSearch:", error);
    console.log("Falling back to local internship data (Priority 2)");
    
    // Fallback to local data when API fails
    return {
      success: true,
      internships: FALLBACK_INTERNSHIPS,
      totalResults: FALLBACK_INTERNSHIPS.length,
      error: error.message,
      source: "fallback",
    };
  }
}
