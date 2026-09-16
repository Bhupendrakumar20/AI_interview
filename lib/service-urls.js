/**
 * Service URL Resolver with Local / Public Smart Routing & Automatic Failover
 *
 * Automatically detects whether the user is browsing on localhost or a public domain
 * (e.g., Vercel), picking the appropriate service URL while providing seamless failover
 * so that no function is left behind.
 */

/**
 * Checks if the current context (browser or incoming server request) is local.
 * @param {Request|Headers|null} request 
 * @returns {boolean}
 */
export function isLocalEnvironment(request = null) {
  // 1. Client-side browser check
  if (typeof window !== "undefined" && window.location) {
    const hostname = window.location.hostname || "";
    return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "0.0.0.0";
  }

  // 2. Server-side check from incoming request headers
  if (request) {
    try {
      const getHeader = (name) => {
        if (typeof request.headers?.get === "function") return request.headers.get(name);
        if (request.headers && typeof request.headers === "object") return request.headers[name];
        return null;
      };

      const host = getHeader("host") || "";
      const referer = getHeader("referer") || "";
      const target = host || referer;

      if (target) {
        if (
          target.includes("localhost") ||
          target.includes("127.0.0.1") ||
          target.includes("0.0.0.0")
        ) {
          return true;
        }
        return false;
      }
    } catch {
      // fallback to NODE_ENV
    }
  }

  // 3. Fallback based on NODE_ENV
  return process.env.NODE_ENV !== "production";
}

/**
 * Normalizes a URL string by trimming whitespace and trailing slashes.
 */
function cleanUrl(url) {
  if (!url || typeof url !== "string") return "";
  return url.trim().replace(/\/+$/, "");
}

/**
 * Returns prioritized service URL candidates based on whether the context is local or public.
 * @param {'resume'|'adaptive'|'socket'|'ollama'|'app'} service 
 * @param {Request|null} request 
 * @returns {string[]} Ordered list of candidate base URLs
 */
export function getServiceCandidates(service, request = null) {
  const isLocal = isLocalEnvironment(request);

  switch (service) {
    case "resume": {
      const localUrl = cleanUrl(
        process.env.NEXT_PUBLIC_LOCAL_RESUME_URL ||
        process.env.NEXT_PUBLIC_RESUME_API_URL_2 ||
        "http://127.0.0.1:8000"
      );
      const publicUrl = cleanUrl(process.env.NEXT_PUBLIC_RESUME_API_URL);

      const candidates = isLocal
        ? [localUrl, publicUrl]
        : [publicUrl, localUrl];

      return Array.from(new Set(candidates.filter(Boolean)));
    }

    case "adaptive": {
      const localUrl = cleanUrl(
        process.env.NEXT_PUBLIC_LOCAL_ADAPTIVE_URL ||
        process.env.NEXT_PUBLIC_ADAPTIVE_API_URL_2 ||
        "http://127.0.0.1:8001"
      );
      const publicUrl = cleanUrl(
        process.env.NEXT_PUBLIC_ADAPTIVE_API_URL ||
        "https://ai-buddy-mode-api.onrender.com"
      );

      const candidates = isLocal
        ? [localUrl, publicUrl]
        : [publicUrl, localUrl];

      return Array.from(new Set(candidates.filter(Boolean)));
    }

    case "socket": {
      const localUrl = cleanUrl(process.env.NEXT_PUBLIC_LOCAL_SOCKET_URL || "http://localhost:4002");
      const publicUrl = cleanUrl(process.env.NEXT_PUBLIC_SOCKET_IO_URL);

      const candidates = isLocal
        ? [localUrl, publicUrl]
        : [publicUrl, localUrl];

      return Array.from(new Set(candidates.filter(Boolean)));
    }

    case "ollama": {
      const localUrl = cleanUrl(
        process.env.NEXT_PUBLIC_LOCAL_OLLAMA_URL ||
        process.env.OLLAMA_URL_2 ||
        "http://127.0.0.1:11434"
      );
      const publicUrl = cleanUrl(process.env.OLLAMA_URL);

      const candidates = isLocal
        ? [localUrl, publicUrl]
        : [publicUrl, localUrl];

      return Array.from(new Set(candidates.filter(Boolean)));
    }

    case "app": {
      const localUrl = cleanUrl(process.env.NEXT_PUBLIC_LOCAL_APP_URL || "http://localhost:4001");
      const publicUrl = cleanUrl(
        process.env.NEXT_PUBLIC_SITE_URL ||
        process.env.NEXT_PUBLIC_BASE_URL ||
        process.env.NEXT_PUBLIC_APP_URL
      );

      const candidates = isLocal
        ? [localUrl, publicUrl]
        : [publicUrl, localUrl];

      return Array.from(new Set(candidates.filter(Boolean)));
    }

    default:
      return [];
  }
}

/**
 * Returns the primary URL for a service.
 */
export function getPrimaryServiceUrl(service, request = null) {
  const candidates = getServiceCandidates(service, request);
  return candidates[0] || "";
}

/**
 * Attempts a fetch across prioritized service candidates with automatic failover.
 *
 * @param {'resume'|'adaptive'|'socket'|'ollama'} service 
 * @param {string} endpointPath e.g. "/parse" or "/generate-questions"
 * @param {RequestInit|((baseUrl: string) => RequestInit)} optionsOrFactory 
 * @param {Request|null} request Incoming request for context detection
 * @returns {Promise<{response: Response, baseUrl: string}>}
 */
export async function fetchWithServiceFallback(
  service,
  endpointPath,
  optionsOrFactory = {},
  request = null
) {
  const candidates = getServiceCandidates(service, request);
  let lastError = null;
  let lastResponse = null;

  for (let i = 0; i < candidates.length; i++) {
    const baseUrl = candidates[i];
    const path = endpointPath.startsWith("/") ? endpointPath : `/${endpointPath}`;
    const fullUrl = `${baseUrl}${path}`;

    try {
      const options = typeof optionsOrFactory === "function"
        ? optionsOrFactory(baseUrl)
        : optionsOrFactory;

      // Inject default bypass header for Ngrok / Localtunnel
      const headers = {
        "bypass-tunnel-reminder": "true",
        "ngrok-skip-browser-warning": "true",
        ...(options.headers || {}),
      };

      // Automatically attach tunnel basic auth credentials if configured
      if (service === "resume" && process.env.RESUME_API_USERNAME && process.env.RESUME_API_PASSWORD && !headers["Authorization"]) {
        const auth = Buffer.from(
          `${process.env.RESUME_API_USERNAME}:${process.env.RESUME_API_PASSWORD}`
        ).toString("base64");
        headers["Authorization"] = `Basic ${auth}`;
      } else if (service === "ollama" && process.env.OLLAMA_USERNAME && process.env.OLLAMA_PASSWORD && !headers["Authorization"]) {
        const auth = Buffer.from(
          `${process.env.OLLAMA_USERNAME}:${process.env.OLLAMA_PASSWORD}`
        ).toString("base64");
        headers["Authorization"] = `Basic ${auth}`;
      }

      const res = await fetch(fullUrl, {
        ...options,
        headers,
      });

      // If response is successful, return immediately
      if (res.ok) {
        return { response: res, baseUrl };
      }

      // If server responded with an error that could indicate tunnel/auth or 5xx issues, try next candidate
      lastResponse = res;
      console.warn(
        `⚠️ [Service Failover] ${service} at ${fullUrl} returned status ${res.status}. Attempting candidate ${i + 2}/${candidates.length}...`
      );
    } catch (err) {
      lastError = err;
      console.warn(
        `⚠️ [Service Failover] Network error connecting to ${service} at ${fullUrl} (${err.message}). Attempting candidate ${i + 2}/${candidates.length}...`
      );
    }
  }

  // If we have a response from the primary server (even if non-2xx), return it if no successful candidate was found
  if (lastResponse) {
    return { response: lastResponse, baseUrl: candidates[0] };
  }

  throw lastError || new Error(`All ${service} service endpoints failed.`);
}
