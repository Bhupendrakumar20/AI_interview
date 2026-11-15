export async function GET() {
  const OLLAMA_URL = (
    process.env.OLLAMA_URL ||
    process.env.OLLAMA_URL_2 ||
    ""
  ).trim();

  const MODEL_NAME =
    process.env.OLLAMA_MODEL || "gemma3:4b";

  if (!OLLAMA_URL) {
    return Response.json({
      success: false,
      stage: "configuration",
      error: "OLLAMA_URL is missing",
    });
  }

  const baseUrl = OLLAMA_URL
    .replace(/\/api\/(chat|generate|tags|ps)\/?$/i, "")
    .replace(/\/+$/, "");

  const endpoint = `${baseUrl}/api/chat`;

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

  const controller = new AbortController();

  const timeout = setTimeout(
    () => controller.abort(),
    180000
  );

  const startTime = Date.now();

  try {
    console.log("[TEST] Calling Ollama:", endpoint);
    console.log("[TEST] Model:", MODEL_NAME);

    const response = await fetch(endpoint, {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
        ...(authHeader
          ? { Authorization: authHeader }
          : {}),
      },

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

    const responseTime =
      Date.now() - startTime;

    const responseText = await response.text();

    console.log("[TEST] HTTP Status:", response.status);
    console.log("[TEST] Response:", responseText.slice(0, 1000));

    if (!response.ok) {
      return Response.json({
        success: false,
        stage: "ollama_http",
        status: response.status,
        endpoint,
        response: responseText,
        responseTime,
      });
    }

    const data = JSON.parse(responseText);

    return Response.json({
      success: true,
      stage: "ollama_generation",
      status: response.status,
      model: MODEL_NAME,
      response: data.message?.content || data.response,
      responseTime,
    });

  } catch (error) {
    console.error("[TEST] Ollama failed:", error);

    return Response.json({
      success: false,
      stage: "network_or_timeout",
      error: error.message,
      errorName: error.name,
      cause: error.cause?.message,
      endpoint,
      responseTime: Date.now() - startTime,
    });

  } finally {
    clearTimeout(timeout);
  }
}