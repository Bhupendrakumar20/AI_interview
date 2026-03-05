// app/api/tts/route.js
// Text-to-Speech API Route
// Handles TTS requests from client and returns audio data

import { NextRequest, NextResponse } from "next/server";
import { generateSpeech } from "@/lib/modules/text-to-speech/index.js";

/**
 * POST /api/tts
 * 
 * Request body:
 * {
 *   text: string (required) - Text to convert to speech
 *   voiceName?: string - Voice name (Phoebe, Charon, Kore, Fenrir, Aoede)
 *   speakingRate?: number - Speaking rate (0.25-4.0)
 *   pitch?: number - Pitch adjustment (-20 to 20)
 * }
 * 
 * Response:
 * {
 *   success: boolean
 *   audioData?: string - Base64 encoded audio
 *   mimeType?: string - Audio MIME type
 *   error?: string - Error message if failed
 * }
 */
export async function POST(request) {
  try {
    // Parse request
    const body = await request.json();
    const { text, voiceName, speakingRate, pitch } = body;

    // Validate input
    if (!text || typeof text !== "string") {
      return NextResponse.json(
        { success: false, error: "Text is required" },
        { status: 400 }
      );
    }

    // Prepare config
    const config = {};
    if (voiceName) config.voiceName = voiceName;
    if (speakingRate) config.speakingRate = speakingRate;
    if (pitch) config.pitch = pitch;

    // Generate speech
    const result = await generateSpeech(text, config);

    // Return response
    return NextResponse.json(result);
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("TTS API Error:", errorMessage);

    return NextResponse.json(
      {
        success: false,
        error: `TTS API Error: ${errorMessage}`,
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/tts
 * Health check endpoint
 */
export async function GET() {
  return NextResponse.json({
    status: "ok",
    name: "Text-to-Speech API",
    description: "Convert text to speech using Google Generative AI",
  });
}
