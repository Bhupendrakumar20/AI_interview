import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Load .env.local
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

import { generateMockTestQuestions } from "../lib/actions/mock-test.action.js";

async function runTest() {
  console.log("🚀 Testing AI (Groq/Gemini) by generating Microsoft Mock Test Questions...");
  
  try {
    const result = await generateMockTestQuestions({
      company: "Microsoft",
      role: "Software Engineer",
      difficulty: "Medium",
      questionType: "Technical",
      count: 3,
      userId: "test-user-microsoft"
    });

    console.log("\n===================================");
    console.log("Result Status:", result.success ? "✅ Success" : "❌ Failed");
    if (result.success) {
      console.log(`Total questions generated: ${result.totalQuestions}`);
      console.log("\nQuestions details:\n");
      result.questions.forEach((q, idx) => {
        console.log(`Question ${idx + 1}: ${q.question}`);
        console.log(`Expected Answer/Approach: ${q.expectedAnswer}`);
        console.log(`Tips:`);
        q.tips.forEach(t => console.log(`  - ${t}`));
        console.log(`Difficulty: ${q.difficulty}`);
        console.log("-----------------------------------");
      });
    } else {
      console.error("Error message:", result.error);
    }
  } catch (error) {
    console.error("Exception during test:", error);
  }
}

runTest();
