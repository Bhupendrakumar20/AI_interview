// Better test script that actually generates content
import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = "AIzaSyDKYHo78JmMSOHgCoUBm_5x2zaplbnCtXI";
const genAI = new GoogleGenerativeAI(apiKey);

async function testModel(modelName) {
  try {
    const model = genAI.getGenerativeModel({ model: modelName });
    const result = await model.generateContent("Say hello");
    console.log(`✅ ${modelName} - WORKS!`);
    return true;
  } catch (error) {
    const msg = error.message.split('\n')[0];
    console.log(`❌ ${modelName} - ${msg}`);
    return false;
  }
}

async function findWorkingModel() {
  const modelsToTest = [
    "gemini-2.0-flash",
    "gemini-1.5-pro",
    "gemini-1.5-flash",
    "gemini-pro",
    "models/gemini-2.0-flash",
    "models/gemini-1.5-pro",
    "models/gemini-1.5-flash"
  ];

  console.log("🧪 Testing which Gemini models work:\n");
  
  for (const model of modelsToTest) {
    await testModel(model);
  }
}

findWorkingModel();
