const DEFAULT_RESUME_API_URL = "http://127.0.0.1:8000";
const UNAVAILABLE_STATUSES = new Set([404, 502, 503, 504]);

export async function fetchResumeApi(path, options) {
  const urls = [
    process.env.NEXT_PUBLIC_RESUME_API_URL,
    process.env.NEXT_PUBLIC_RESUME_API_URL_2,
    DEFAULT_RESUME_API_URL,
  ]
    .filter(Boolean)
    .map((url) => url.replace(/\/+$/, ""));
  const uniqueUrls = [...new Set(urls)];

  let lastResponse;
  let lastError;

  for (let index = 0; index < uniqueUrls.length; index += 1) {
    const url = uniqueUrls[index];
    const hasFallback = index < uniqueUrls.length - 1;

    try {
      const response = await fetch(`${url}${path}`, options);
      if (hasFallback && UNAVAILABLE_STATUSES.has(response.status)) {
        console.warn(
          `Resume API at ${url} returned ${response.status}; trying the next configured URL.`
        );
        await response.body?.cancel();
        lastResponse = response;
        continue;
      }

      return response;
    } catch (error) {
      if (options?.signal?.aborted || !hasFallback) {
        throw error;
      }

      console.warn(
        `Resume API at ${url} could not be reached; trying the next configured URL: ${error.message}`
      );
      lastError = error;
    }
  }

  if (lastResponse) {
    return lastResponse;
  }

  throw lastError ?? new Error("No resume API URL is configured.");
}
