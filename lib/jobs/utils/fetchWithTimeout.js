// Fetch with a real timeout. Extra options (headers, next: {revalidate}) pass through to fetch.
export async function fetchWithTimeout(resource, { timeout = 12000, ...options } = {}) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    return await fetch(resource, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
}
