import { google as googleProvider } from "@ai-sdk/google";
import { createGroq } from "@ai-sdk/groq";

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
 * Intercepts calls to google() and redirects to Groq if GROQ_API_KEY is configured.
 */
export function google(modelName, options = {}) {
  if (process.env.GROQ_API_KEY) {
    console.log(`🔌 [AI-Provider] Routing Vercel AI SDK model '${modelName}' to Groq (llama-3.3-70b-versatile)`);
    const groq = createGroq({
      apiKey: process.env.GROQ_API_KEY,
      structuredOutputs: false,
    });
    return wrapLanguageModel(groq("llama-3.3-70b-versatile"));
  }

  console.log(`🔌 [AI-Provider] Routing Vercel AI SDK model '${modelName}' to Google Gemini`);
  const apiKey = options.apiKey || process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GOOGLE_API_KEY;
  return googleProvider(modelName, {
    ...options,
    apiKey,
  });
}

/**
 * Custom GoogleGenerativeAI wrapper.
 * Intercepts raw Google Generative AI SDK calls and redirects to Groq if GROQ_API_KEY is configured.
 */
export class GoogleGenerativeAI {
  constructor(apiKey) {
    this.apiKey = apiKey || process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GOOGLE_API_KEY || process.env.GROQ_API_KEY;
  }

  getGenerativeModel({ model }) {
    const isGroq = !!process.env.GROQ_API_KEY;
    const apiKeyToUse = isGroq ? process.env.GROQ_API_KEY : this.apiKey;

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
          console.warn("⚠️ [AI-Provider] TTS requested but not supported by Groq. Returning mock audio data.");
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
                        data: "UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAAA", // silent WAV placeholder
                      }
                    }
                  ]
                }
              }
            ]
          };
        }

        if (isGroq) {
          console.log(`🔌 [AI-Provider] Routing raw SDK call for '${model}' to Groq Chat Completion API`);
          
          const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${apiKeyToUse}`,
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
          console.log(`🔌 [AI-Provider] Routing raw SDK call for '${model}' to Google Gemini API`);
          
          const url = `https://generativelanguage.googleapis.com/v1beta/models/${model || "gemini-pro"}:generateContent?key=${apiKeyToUse}`;
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
      }
    };
  }
}
