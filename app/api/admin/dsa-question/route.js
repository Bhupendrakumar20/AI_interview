import { db } from "@/firebase/admin";

export async function POST(req) {
  try {
    const body = await req.json();
    const { id, title, difficulty, timeLimitMs = 5000, testCases = [] } = body;

    if (!id || !title || !difficulty) {
      return Response.json({ error: "id, title, and difficulty are required" }, { status: 400 });
    }

    const batch = db.batch();

    // 1. Write question metadata
    const questionRef = db.collection("dsa_questions").doc(id);
    batch.set(questionRef, {
      id,
      title,
      difficulty,
      timeLimitMs: Number(timeLimitMs),
      createdAt: new Date(),
    });

    // 2. Write each test case
    testCases.forEach((tc, idx) => {
      const caseId = `${id}_case_${idx}`;
      const caseRef = db.collection("dsa_test_cases").doc(caseId);
      batch.set(caseRef, {
        questionId: id,
        stdin: tc.stdin || "",
        expectedOutput: tc.expectedOutput || "",
        isHidden: !!tc.isHidden,
      });
    });

    await batch.commit();

    return Response.json({
      success: true,
      message: `Successfully registered question '${title}' with ${testCases.length} test cases.`,
    });
  } catch (err) {
    console.error("[/api/admin/dsa-question] Error saving question:", err);
    return Response.json({ error: err.message || "Failed to save question" }, { status: 500 });
  }
}
