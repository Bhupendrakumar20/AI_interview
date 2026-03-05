export async function POST(request) {
  try {
    const { query, variables, operationName } = await request.json();

    const response = await fetch("https://leetcode.com/graphql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify({
        query,
        variables,
        operationName,
      }),
    });

    const data = await response.json();
    return Response.json(data);
  } catch (error) {
    console.error("LeetCode API Error:", error);
    return Response.json(
      { error: "Failed to fetch from LeetCode API", details: error.message },
      { status: 500 }
    );
  }
}
