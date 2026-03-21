// /app/api/leetcode/daily-question/route.js
// Fetch LeetCode's daily coding challenge question

export async function GET(request) {
  try {
    const response = await fetch("https://leetcode.com/graphql/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
      body: JSON.stringify({
        query: `
          query questionOfToday {
            activeDailyCodingChallengeQuestion {
              date
              link
              question {
                titleSlug
                title
                difficulty
                frontendQuestionId: questionFrontendId
                status
                topicTags { 
                  name 
                  id 
                  slug 
                }
              }
            }
          }
        `,
        variables: {},
        operationName: "questionOfToday",
      }),
    });

    if (!response.ok) {
      throw new Error(`LeetCode API returned status ${response.status}`);
    }

    const data = await response.json();

    // Handle GraphQL errors
    if (data.errors) {
      console.error("GraphQL errors:", data.errors);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Failed to fetch daily question from LeetCode",
          details: data.errors,
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Extract the daily challenge question
    const dailyQuestion =
      data?.data?.activeDailyCodingChallengeQuestion;

    if (!dailyQuestion) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "No daily question available",
        }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // Format the response
    const formatted = {
      success: true,
      date: dailyQuestion.date,
      link: dailyQuestion.link,
      question: {
        id: dailyQuestion.question.frontendQuestionId,
        title: dailyQuestion.question.title,
        titleSlug: dailyQuestion.question.titleSlug,
        difficulty: dailyQuestion.question.difficulty,
        topics: dailyQuestion.question.topicTags.map((tag) => ({
          name: tag.name,
          slug: tag.slug,
        })),
        status: dailyQuestion.question.status,
        leetcodeUrl: `https://leetcode.com/problems/${dailyQuestion.question.titleSlug}/`,
      },
    };

    return new Response(JSON.stringify(formatted), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error fetching daily question:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: "Failed to fetch daily question",
        message: error.message,
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
