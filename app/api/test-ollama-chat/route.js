
export async function GET() {
  const OLLAMA_URLS = [
    process.env.OLLAMA_URL,
    process.env.OLLAMA_URL_2,
  ]
    .filter(Boolean)
    .map((url) => url.trim());

  const MODEL_NAME =
    process.env.OLLAMA_MODEL || "gemma3:4b";

  if (OLLAMA_URLS.length === 0) {
    return Response.json({
      success: false,
      stage: "configuration",
      error: "OLLAMA_URL and OLLAMA_URL_2 are missing",
    });
  }

  const username = (
    process.env.OLLAMA_USERNAME || ""
  ).trim();

  const password =
    process.env.OLLAMA_PASSWORD || "";

  const authHeader = username
    ? `Basic ${Buffer.from(
        `${username}:${password}`
      ).toString("base64")}`
    : undefined;

  const requestHeaders = {
    "Content-Type": "application/json",
    ...(authHeader
      ? { Authorization: authHeader }
      : {}),
  };

  const errors = [];

  // Try each configured Ollama URL
  for (let index = 0; index < OLLAMA_URLS.length; index++) {
    const currentUrl = OLLAMA_URLS[index];

    const baseUrl = currentUrl
      .replace(/\/api\/(chat|generate|tags|ps)\/?$/i, "")
      .replace(/\/+$/, "");

    const endpoint = `${baseUrl}/api/chat`;

    const startTime = Date.now();

    const controller = new AbortController();

    const timeout = setTimeout(
      () => controller.abort(),
      180000
    );

    try {
      console.log(
        `[TEST] Attempt ${index + 1}/${OLLAMA_URLS.length}`
      );

      console.log("[TEST] Endpoint:", endpoint);
      console.log("[TEST] Model:", MODEL_NAME);

      const response = await fetch(endpoint, {
        method: "POST",

        headers: requestHeaders,

        body: JSON.stringify({
          model: MODEL_NAME,

          messages: [
            {
              role: "user",
              content: "Hello! Reply with: Ollama is working.",
            },
          ],

          stream: false,

          options: {
            temperature: 0.3,
          },
        }),

        signal: controller.signal,
      });

      const responseTime = Date.now() - startTime;

      const responseText = await response.text();

      console.log(
        "[TEST] HTTP Status:",
        response.status
      );

      if (!response.ok) {
        throw new Error(
          `HTTP ${response.status}: ${responseText.slice(0, 500)}`
        );
      }

      const data = JSON.parse(responseText);

      const generatedText =
        data.message?.content || data.response;

      if (!generatedText) {
        throw new Error("Ollama returned empty content");
      }

      console.log(
        `[TEST] Success using URL ${index + 1}`
      );

      return Response.json({
        success: true,
        stage: "ollama_generation",
        attempt: index + 1,
        totalUrls: OLLAMA_URLS.length,
        source: index === 0 ? "OLLAMA_URL" : "OLLAMA_URL_2",
        status: response.status,
        model: MODEL_NAME,
        response: generatedText,
        responseTime,
      });

    } catch (error) {
      const errorDetails = {
        attempt: index + 1,
        source: index === 0 ? "OLLAMA_URL" : "OLLAMA_URL_2",
        error: error.message,
        errorName: error.name,
        cause: error.cause?.message,
        endpoint,
        responseTime: Date.now() - startTime,
      };

      console.error(
        "[TEST] Ollama URL failed:",
        errorDetails
      );

      errors.push(errorDetails);

    } finally {
      clearTimeout(timeout);
    }
  }

  // Both URLs failed
  return Response.json(
    {
      success: false,
      stage: "all_ollama_urls_failed",
      model: MODEL_NAME,
      attempts: errors.length,
      errors,
    },
    { status: 502 }
  );
}