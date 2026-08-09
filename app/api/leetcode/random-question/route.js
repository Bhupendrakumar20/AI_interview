import { db } from "@/firebase/admin";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const difficultyParam = searchParams.get("difficulty") || "Medium";
    const countParam = searchParams.get("count");
    const count = countParam ? Math.max(2, Math.min(4, parseInt(countParam) || 2)) : 1;
    
    // Normalize difficulty casing (Easy, Medium, Hard)
    const difficulty = difficultyParam.charAt(0).toUpperCase() + difficultyParam.slice(1).toLowerCase();

    console.log(`[Random Question API] Fetching ${count} random question(s) for difficulty: ${difficulty}`);

    // Query questions from Firestore
    const questionsSnapshot = await db
      .collection("dsa_questions")
      .where("difficulty", "==", difficulty)
      .get();

    if (questionsSnapshot.empty) {
      return Response.json(
        { success: false, error: `No questions found in database for difficulty: ${difficulty}` },
        { status: 404, headers: CORS_HEADERS }
      );
    }

    const docs = [];
    questionsSnapshot.forEach((doc) => {
      docs.push({ id: doc.id, ...doc.data() });
    });

    // Only keep questions that have configured test cases in dsa_test_cases
    const validDocs = [];
    await Promise.all(docs.map(async (doc) => {
      const tcSnapshot = await db
        .collection("dsa_test_cases")
        .where("questionId", "==", doc.id)
        .limit(1)
        .get();
      if (!tcSnapshot.empty) {
        validDocs.push(doc);
      }
    }));

    if (validDocs.length === 0) {
      return Response.json(
        { success: false, error: `No questions with test cases found for difficulty: ${difficulty}` },
        { status: 404, headers: CORS_HEADERS }
      );
    }

    // Shuffle the matching list and take 'count' elements
    for (let i = validDocs.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [validDocs[i], validDocs[j]] = [validDocs[j], validDocs[i]];
    }

    const selectedDocs = validDocs.slice(0, Math.min(count, validDocs.length));

    // Fetch associated test cases for each selected question
    const formattedQuestions = await Promise.all(selectedDocs.map(async (selectedQuestion) => {
      const testCasesSnapshot = await db
        .collection("dsa_test_cases")
        .where("questionId", "==", selectedQuestion.id)
        .get();

      const testCases = [];
      testCasesSnapshot.forEach((doc) => {
        const tc = doc.data();
        testCases.push({
          stdin: tc.stdin || "",
          expectedOutput: tc.expectedOutput || "",
          explanation: tc.explanation || "",
          isHidden: !!tc.isHidden
        });
      });

      // Map tags to match topicTags expected by frontend UI
      const topicTags = (selectedQuestion.tags || []).map((tag) => ({
        name: tag,
        slug: tag.toLowerCase().replace(/\s+/g, "-"),
      }));

      return {
        id: selectedQuestion.id,
        questionId: selectedQuestion.id,
        title: selectedQuestion.title,
        titleSlug: selectedQuestion.titleSlug || selectedQuestion.id.replace(/^lc_/, ""),
        difficulty: selectedQuestion.difficulty,
        content: selectedQuestion.description || "",
        description: selectedQuestion.description || "",
        topicTags: topicTags,
        tags: selectedQuestion.tags || [],
        codeSnippets: selectedQuestion.codeSnippets || [],
        testCases: testCases,
      };
    }));

    console.log(`[Random Question API] Selected questions:`, formattedQuestions.map(q => q.title));

    if (count === 1) {
      return Response.json({
        success: true,
        question: formattedQuestions[0],
        questions: formattedQuestions
      }, { headers: CORS_HEADERS });
    }

    return Response.json({
      success: true,
      questions: formattedQuestions
    }, { headers: CORS_HEADERS });
  } catch (error) {
    console.error("[Random Question API Error]:", error);
    return Response.json(
      { success: false, error: "Failed to fetch random questions", message: error.message },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
