/**
 * GET /api/debug/check-gemini-key
 * 
 * Diagnostic endpoint to verify:
 * 1. Gemini API key is configured
 * 2. API key is valid and can connect to Google AI
 * 3. Model availability
 * 4. API quota status
 * 
 * ONLY for debugging - remove before production
 */

import { NextResponse } from "next/server";
import { google } from "@ai-sdk/google";
import { generateText } from "ai";

export async function GET(request) {
  try {
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GOOGLE_API_KEY;

    // Check 1: API Key exists
    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          checks: {
            apiKeyExists: false,
            apiKeyConfigured: false,
            message: "❌ GOOGLE_GENERATIVE_AI_API_KEY is not configured in environment variables",
            solution: "Add GOOGLE_GENERATIVE_AI_API_KEY to .env.local or deployment environment",
          },
        },
        { status: 400 }
      );
    }

    console.log("✅ API Key found in environment");

    // Check 2: Try a simple API call to verify key validity
    console.log("🔍 Testing Gemini API connection...");
    
    const model = google("gemini-2.0-flash", {
      apiKey: apiKey,
      useStructuredOutputs: false,
    });

    const testResult = await generateText({
      model: model,
      prompt: "Say 'Gemini API is working' in exactly one sentence.",
      maxTokens: 50,
    });

    console.log("✅ API call successful");
    console.log("Response:", testResult.text);

    return NextResponse.json({
      success: true,
      checks: {
        apiKeyExists: true,
        apiKeyConfigured: true,
        apiKeyValid: true,
        apiCallSuccessful: true,
        geminiResponse: testResult.text,
        model: "gemini-2.0-flash",
        timestamp: new Date().toISOString(),
        message: "✅ Gemini API is working correctly",
      },
    });
  } catch (error) {
    const errorMsg = error.message || "Unknown error";
    console.error("❌ Gemini API Check Failed:", errorMsg);

    // Diagnose specific errors
    let solution = "Unknown error. Check server logs.";

    if (errorMsg.includes("API key")) {
      solution = "Invalid API key. Verify GOOGLE_GENERATIVE_AI_API_KEY in environment";
    } else if (errorMsg.includes("401") || errorMsg.includes("unauthorized")) {
      solution = "Unauthorized. API key may be invalid or revoked";
    } else if (errorMsg.includes("429") || errorMsg.includes("quota")) {
      solution = "API quota exceeded. Upgrade your Google AI Studio plan or wait for reset";
    } else if (errorMsg.includes("403") || errorMsg.includes("permission")) {
      solution = "Permission denied. Check API key permissions";
    } else if (errorMsg.includes("404") || errorMsg.includes("not found")) {
      solution = "Model or endpoint not found. Try gemini-2.0-flash";
    }

    return NextResponse.json(
      {
        success: false,
        checks: {
          apiKeyExists: true,
          apiKeyConfigured: true,
          apiKeyValid: false,
          apiCallSuccessful: false,
          error: errorMsg,
          solution: solution,
          timestamp: new Date().toISOString(),
        },
      },
      { status: 500 }
    );
  }
}
