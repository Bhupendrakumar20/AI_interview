// lib/modules/text-to-speech/tts.service.js
// Text-to-Speech Service using Google Generative AI
// Handles conversion of text to audio using Gemini 2.5 Flash TTS model

import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * Audio voice options available in Google GenAI TTS
 */
export const VOICE_OPTIONS = {
  PHOEBE: "Phoebe",  // US English, female, warm and expressive
  CHARON: "Charon",  // US English, male, deep and authoritative
  KORE: "Kore",      // US English, female, clear and energetic
  FENRIR: "Fenrir",  // US English, male, smooth and calm
  AOEDE: "Aoede",    // US English, female, melodic
};

/**
 * Audio encoding options
 */
export const AUDIO_ENCODING = {
  LINEAR_16: "LINEAR16",
  MP3: "MP3",
};

/**
 * @typedef {Object} TTSConfig
 * @property {string} [voiceName]
 * @property {string} [audioEncoding]
 * @property {number} [speakingRate]
 * @property {number} [pitch]
 */

/**
 * @typedef {Object} TTSResponse
 * @property {boolean} success
 * @property {string} [audioData]
 * @property {string} [mimeType]
 * @property {string} [error]
 * @property {number} [duration]
 */

/**
 * Initialize Google Generative AI client
 */
function initializeGenAI() {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GOOGLE_GENERATIVE_AI_API_KEY is not set in environment variables"
    );
  }
  return new GoogleGenerativeAI({ apiKey });
}

/**
 * Convert text to speech using Google Generative AI
 *
 * @param {string} text - Text to convert to speech
 * @param {TTSConfig} config - TTS configuration options
 * @returns {Promise<TTSResponse>} Promise with audio data in base64 format
 *
 * @example
 * const result = await generateSpeech('Hello world', {
 *   voiceName: VOICE_OPTIONS.KORE,
 *   speakingRate: 1.0,
 * });
 * if (result.success) {
 *   const audioBlob = new Blob(
 *     [Buffer.from(result.audioData, 'base64')],
 *     { type: 'audio/wav' }
 *   );
 * }
 */
export async function generateSpeech(text, config = {}) {
  try {
    // Validate input
    if (!text || text.trim().length === 0) {
      return {
        success: false,
        error: "Text cannot be empty",
      };
    }

    if (text.length > 10000) {
      return {
        success: false,
        error: "Text exceeds maximum length of 10000 characters",
      };
    }

    // Initialize client
    const genAI = initializeGenAI();

    // Set defaults
    const voiceName = config.voiceName || VOICE_OPTIONS.KORE;
    const speakingRate = config.speakingRate || 1.0;
    const pitch = config.pitch || 0;

    // Generate content with TTS
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash", // Using flash model for TTS
    });

    const response = await model.generateContent({
      contents: [
        {
          parts: [
            {
              text: text,
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 1, // Required for content generation
      },
      responseModalities: ["AUDIO"],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: {
            voiceName: voiceName,
          },
        },
        // Only include optional parameters if provided
        ...(speakingRate !== 1.0 && { speakingRate }),
        ...(pitch !== 0 && { pitch }),
      },
    });

    // Extract audio data
    const audioContent = response.candidates?.[0]?.content?.parts?.[0];

    if (!audioContent || !("inlineData" in audioContent)) {
      return {
        success: false,
        error: "No audio data in response",
      };
    }

    const inlineData = audioContent.inlineData;

    return {
      success: true,
      audioData: inlineData.data,
      mimeType: inlineData.mimeType,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : String(error);
    console.error("TTS Error:", errorMessage);

    return {
      success: false,
      error: `Text-to-speech conversion failed: ${errorMessage}`,
    };
  }
}

/**
 * Stream text to speech for real-time playback
 * Splits long text into chunks for streaming
 *
 * @param {string} text - Long text to convert to speech
 * @param {TTSConfig} config - TTS configuration
 * @param {number} chunkSize - Characters per chunk (default 500)
 * @returns {Promise<TTSResponse[]>} Array of audio chunks in base64 format
 */
export async function generateSpeechStream(text, config = {}, chunkSize = 500) {
  const chunks = [];
  let currentIndex = 0;

  while (currentIndex < text.length) {
    const chunk = text.substring(currentIndex, currentIndex + chunkSize);
    const result = await generateSpeech(chunk, config);
    chunks.push(result);

    if (!result.success) {
      console.warn(`Failed to convert chunk: ${result.error}`);
    }

    currentIndex += chunkSize;

    // Add small delay between requests to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  return chunks;
}

/**
 * Convert text to audio element for web playback
 *
 * @param {string} text - Text to convert
 * @param {TTSConfig} config - TTS configuration
 * @returns {Promise<HTMLAudioElement|null>} HTML Audio element or null on error
 */
export async function generateAudioElement(text, config = {}) {
  try {
    const result = await generateSpeech(text, config);

    if (!result.success || !result.audioData) {
      console.error("Failed to generate speech:", result.error);
      return null;
    }

    // Convert base64 to blob
    const binaryString = atob(result.audioData);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    const audioBlob = new Blob([bytes], { type: result.mimeType });
    const audioUrl = URL.createObjectURL(audioBlob);

    // Create audio element
    const audio = new Audio(audioUrl);
    return audio;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : String(error);
    console.error("Failed to create audio element:", errorMessage);
    return null;
  }
}

/**
 * Play text as speech immediately
 *
 * @param {string} text - Text to speak
 * @param {TTSConfig} config - TTS configuration
 * @returns {Promise<boolean>} Success status
 */
export async function playTextToSpeech(text, config = {}) {
  try {
    const audio = await generateAudioElement(text, config);

    if (!audio) {
      return false;
    }

    audio.play();
    return true;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : String(error);
    console.error("Failed to play speech:", errorMessage);
    return false;
  }
}

export default {
  generateSpeech,
  generateSpeechStream,
  generateAudioElement,
  playTextToSpeech,
  VOICE_OPTIONS,
  AUDIO_ENCODING,
};
