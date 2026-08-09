import { google as googleProvider } from "@ai-sdk/google";
import { createGroq } from "@ai-sdk/groq";

// Registry for key health tracking
const keyHealthRegistry = new Map(); // key -> { status: 'active' | 'rate-limited' | 'invalid', cooldownUntil: number }

function getKeysForProvider(provider) {
  const keys = [];
  const primaryEnv = provider === 'google' ? 'GOOGLE_GENERATIVE_AI_API_KEY' : 'GROQ_API_KEY';
  const fallbackEnv = provider === 'google' ? 'GOOGLE_API_KEY' : null;
  const geminiEnv = provider === 'google' ? 'GEMINI_API_KEY' : null;

  // 1. Primary Env
  const primaryVal = process.env[primaryEnv];
  if (primaryVal) {
    keys.push(...primaryVal.split(',').map(k => k.trim()).filter(Boolean));
  }

  // 2. Fallback Env
  if (fallbackEnv) {
    const fallbackVal = process.env[fallbackEnv];
    if (fallbackVal) {
      keys.push(...fallbackVal.split(',').map(k => k.trim()).filter(Boolean));
    }
  }

  // 2.5 Gemini Env
  if (geminiEnv) {
    const geminiVal = process.env[geminiEnv];
    if (geminiVal) {
      keys.push(...geminiVal.split(',').map(k => k.trim()).filter(Boolean));
    }
  }

  // 3. Numbered keys (e.g. GOOGLE_GENERATIVE_AI_API_KEY_1)
  let index = 1;
  while (true) {
    const keyVal = process.env[`${primaryEnv}_${index}`];
    if (!keyVal) break;
    keys.push(...keyVal.split(',').map(k => k.trim()).filter(Boolean));
    index++;
  }

  if (fallbackEnv) {
    index = 1;
    while (true) {
      const keyVal = process.env[`${fallbackEnv}_${index}`];
      if (!keyVal) break;
      keys.push(...keyVal.split(',').map(k => k.trim()).filter(Boolean));
      index++;
    }
  }

  if (geminiEnv) {
    index = 1;
    while (true) {
      const keyVal = process.env[`${geminiEnv}_${index}`];
      if (!keyVal) break;
      keys.push(...keyVal.split(',').map(k => k.trim()).filter(Boolean));
      index++;
    }
  }

  return Array.from(new Set(keys));
}

function markKeyRateLimited(key) {
  console.warn(`⚠️ [AI-Provider] Key ${key.substring(0, 10)}... rate limited. Cooling down for 5 minutes.`);
  keyHealthRegistry.set(key, {
    status: 'rate-limited',
    cooldownUntil: Date.now() + 5 * 60 * 1000 // 5 mins cooldown
  });
}

function markKeyInvalid(key) {
  console.error(`❌ [AI-Provider] Key ${key.substring(0, 10)}... is invalid. Disabling.`);
  keyHealthRegistry.set(key, {
    status: 'invalid',
    cooldownUntil: Infinity
  });
}

/**
 * Wraps a LanguageModelV1 to intercept json_schema responseFormat and rewrite it to JSON Mode.
 * This is required for models like llama-3.3-70b-versatile that don't support native json_schema.
 */
function wrapLanguageModel(model) {
  return {
    ...model,
    specificationVersion: model.specificationVersion,
    provider: model.provider,
    modelId: model.modelId,
    defaultObjectGenerationMode: model.defaultObjectGenerationMode,

    async doGenerate(options) {
      const modifiedOptions = { ...options };
      if (modifiedOptions.responseFormat && modifiedOptions.responseFormat.type === 'json') {
        modifiedOptions.responseFormat = { type: 'json' };

        // Ensure the prompt contains the word 'json'
        let hasJsonKeyword = false;
        for (const msg of modifiedOptions.prompt || []) {
          if (typeof msg.content === 'string') {
            if (/json/i.test(msg.content)) {
              hasJsonKeyword = true;
              break;
            }
          } else if (Array.isArray(msg.content)) {
            for (const part of msg.content) {
              if (part.type === 'text' && /json/i.test(part.text)) {
                hasJsonKeyword = true;
                break;
              }
            }
          }
        }

        if (!hasJsonKeyword) {
          if (!modifiedOptions.prompt) {
            modifiedOptions.prompt = [];
          }
          modifiedOptions.prompt.push({
            role: 'system',
            content: 'You must respond with a valid JSON object matching the requested schema.'
          });
        }
      }
      return model.doGenerate(modifiedOptions);
    },

    async doStream(options) {
      const modifiedOptions = { ...options };
      if (modifiedOptions.responseFormat && modifiedOptions.responseFormat.type === 'json') {
        modifiedOptions.responseFormat = { type: 'json' };
      }
      return model.doStream(modifiedOptions);
    }
  };
}

/**
 * Custom google model provider wrapper.
 * Dynamically fails over and rotates keys, supporting fallback between Google and Groq.
 */
export function google(modelName, options = {}) {
  // Return a lazy/virtual language model that intercepts doGenerate and doStream to handle rotation & fallback
  return {
    specificationVersion: 'v2',
    provider: 'failover-provider',
    modelId: modelName,

    async doGenerate(generateOptions) {
      let lastError;
      // Prefer google first if google is explicitly called, fall back to groq
      const providersToTry = ['google', 'groq'];

      for (const provider of providersToTry) {
        const keys = getKeysForProvider(provider);
        if (provider === 'google' && options.apiKey && !keys.includes(options.apiKey)) {
          keys.push(options.apiKey);
        }
        for (const key of keys) {
          const now = Date.now();
          const health = keyHealthRegistry.get(key) || { status: 'active', cooldownUntil: 0 };
          if (health.status === 'invalid') continue;
          if (health.status === 'rate-limited' && health.cooldownUntil > now) continue;

          try {
            let actualModel;
            if (provider === 'google') {
              actualModel = googleProvider(modelName, { ...options, apiKey: key });
            } else {
              const groq = createGroq({ apiKey: key, structuredOutputs: false });
              actualModel = wrapLanguageModel(groq("llama-3.3-70b-versatile"));
            }
            return await actualModel.doGenerate(generateOptions);
          } catch (error) {
            lastError = error;
            const msg = error.message || "";
            if (msg.includes("429") || msg.includes("TooManyRequests") || msg.includes("quota") || msg.includes("Rate limit")) {
              markKeyRateLimited(key);
            } else if (msg.includes("401") || msg.includes("403") || msg.includes("Invalid API key") || msg.includes("Unauthorized")) {
              markKeyInvalid(key);
            } else {
              console.warn(`⚠️ [AI-Provider] google wrapper transient error with key ${key.substring(0, 10)}...: ${msg}`);
            }
          }
        }
      }
      throw lastError || new Error(`All providers and keys exhausted in google() failover`);
    },

    async doStream(streamOptions) {
      let lastError;
      const providersToTry = ['google', 'groq'];

      for (const provider of providersToTry) {
        const keys = getKeysForProvider(provider);
        if (provider === 'google' && options.apiKey && !keys.includes(options.apiKey)) {
          keys.push(options.apiKey);
        }
        for (const key of keys) {
          const now = Date.now();
          const health = keyHealthRegistry.get(key) || { status: 'active', cooldownUntil: 0 };
          if (health.status === 'invalid') continue;
          if (health.status === 'rate-limited' && health.cooldownUntil > now) continue;

          try {
            let actualModel;
            if (provider === 'google') {
              actualModel = googleProvider(modelName, { ...options, apiKey: key });
            } else {
              const groq = createGroq({ apiKey: key, structuredOutputs: false });
              actualModel = wrapLanguageModel(groq("llama-3.3-70b-versatile"));
            }
            return await actualModel.doStream(streamOptions);
          } catch (error) {
            lastError = error;
            const msg = error.message || "";
            if (msg.includes("429") || msg.includes("TooManyRequests") || msg.includes("quota") || msg.includes("Rate limit")) {
              markKeyRateLimited(key);
            } else if (msg.includes("401") || msg.includes("403") || msg.includes("Invalid API key") || msg.includes("Unauthorized")) {
              markKeyInvalid(key);
            } else {
              console.warn(`⚠️ [AI-Provider] google wrapper transient error during streaming with key ${key.substring(0, 10)}...: ${msg}`);
            }
          }
        }
      }
      throw lastError || new Error(`All providers and keys exhausted in google() stream failover`);
    }
  };
}

/**
 * Custom GoogleGenerativeAI wrapper.
 * Intercepts raw Google Generative AI SDK calls and performs key rotation + fallback.
 */
export class GoogleGenerativeAI {
  constructor(apiKey) {
    // Keep apiKey passed in constructor as a potential fallback/additional key
    this.constructorApiKey = apiKey;
  }

  getGenerativeModel({ model }) {
    return {
      generateContent: async (contents) => {
        let promptText = "";
        let generationConfig = {};
        let speechConfig = null;
        let responseModalities = [];

        // Extract prompt text from standard or structured Google format
        if (typeof contents === "string") {
          promptText = contents;
        } else if (contents && contents.contents) {
          const parts = contents.contents[0]?.parts || [];
          promptText = parts.map(p => p.text || "").join("\n");
          generationConfig = contents.generationConfig || {};
          speechConfig = contents.speechConfig || null;
          responseModalities = contents.responseModalities || [];
        } else if (contents && contents.prompt) {
          promptText = contents.prompt;
        }

        // Handle text-to-speech request gracefully
        if (responseModalities.includes("AUDIO") || speechConfig) {
          console.warn("⚠️ [AI-Provider] TTS requested but not supported by Groq/Gemini-fallback. Returning mock audio data.");
          return {
            response: {
              text: () => "Audio generation is not supported on Groq. Please use Google AI for TTS.",
            },
            candidates: [
              {
                content: {
                  parts: [
                    {
                      inlineData: {
                        mimeType: "audio/wav",
                        data: "UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAAA",
                      }
                    }
                  ]
                }
              }
            ]
          };
        }

        let lastError;
        const providersToTry = ['google', 'groq'];

        for (const provider of providersToTry) {
          const keys = getKeysForProvider(provider);
          
          // Add the constructorApiKey if it isn't already included in getKeysForProvider list
          if (provider === 'google' && this.constructorApiKey && !keys.includes(this.constructorApiKey)) {
            keys.push(this.constructorApiKey);
          }

          for (const key of keys) {
            const now = Date.now();
            const health = keyHealthRegistry.get(key) || { status: 'active', cooldownUntil: 0 };
            if (health.status === 'invalid') continue;
            if (health.status === 'rate-limited' && health.cooldownUntil > now) continue;

            try {
              if (provider === 'groq') {
                console.log(`🔌 [AI-Provider] Routing raw SDK call for '${model}' to Groq Chat Completion API using key ${key.substring(0, 10)}...`);
                const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${key}`,
                  },
                  body: JSON.stringify({
                    model: "llama-3.3-70b-versatile",
                    messages: [{ role: "user", content: promptText }],
                    temperature: generationConfig.temperature ?? 0.7,
                  }),
                });

                if (!res.ok) {
                  const errBody = await res.text();
                  throw new Error(`Groq API Error HTTP ${res.status}: ${errBody}`);
                }

                const data = await res.json();
                const responseText = data.choices[0]?.message?.content || "";
                return {
                  response: {
                    text: () => responseText,
                  },
                };
              } else {
                console.log(`🔌 [AI-Provider] Routing raw SDK call for '${model}' to Google Gemini API using key ${key.substring(0, 10)}...`);
                const url = `https://generativelanguage.googleapis.com/v1beta/models/${model || "gemini-pro"}:generateContent?key=${key}`;
                const res = await fetch(url, {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    contents: [{ parts: [{ text: promptText }] }],
                  }),
                });

                if (!res.ok) {
                  const errBody = await res.text();
                  throw new Error(`Google API Error HTTP ${res.status}: ${errBody}`);
                }

                const data = await res.json();
                const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
                return {
                  response: {
                    text: () => responseText,
                  },
                };
              }
            } catch (error) {
              lastError = error;
              const msg = error.message || "";
              if (msg.includes("429") || msg.includes("TooManyRequests") || msg.includes("quota") || msg.includes("Rate limit")) {
                markKeyRateLimited(key);
              } else if (msg.includes("401") || msg.includes("403") || msg.includes("Invalid API key") || msg.includes("Unauthorized") || msg.includes("invalid_api_key")) {
                markKeyInvalid(key);
              } else {
                console.warn(`⚠️ [AI-Provider] Raw SDK call failed with key ${key.substring(0, 10)}...: ${msg}`);
              }
            }
          }
        }
        throw lastError || new Error("All fallback models, keys, and providers failed.");
      }
    };
  }
}
