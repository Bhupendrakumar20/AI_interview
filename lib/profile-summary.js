// lib/profile-summary.js

export function getCategoryScores(feedback) {
  if (Array.isArray(feedback.categoryScores)) return feedback.categoryScores;
  if (feedback.categoryScores && typeof feedback.categoryScores === "object") {
    return Object.entries(feedback.categoryScores).map(([name, value]) => ({
      name,
      score: typeof value === "number" ? value : value?.score,
    }));
  }
  return [];
}

export function buildAnalyticsSummary(feedbacks = [], interviews = []) {
  const scoreRecords = feedbacks.filter((feedback) => typeof feedback.totalScore === "number");
  const averageScore = scoreRecords.length
    ? Math.round(
        scoreRecords.reduce((total, feedback) => total + feedback.totalScore, 0) /
          scoreRecords.length
      )
    : null;
  const categoryTotals = new Map();

  feedbacks.forEach((feedback) => {
    getCategoryScores(feedback).forEach((category) => {
      if (!category?.name || typeof category.score !== "number") return;
      const current = categoryTotals.get(category.name) || { total: 0, count: 0 };
      categoryTotals.set(category.name, {
        total: current.total + category.score,
        count: current.count + 1,
      });
    });
  });

  const strongestCategory =
    [...categoryTotals.entries()]
      .map(([name, value]) => ({ name, score: value.total / value.count }))
      .sort((a, b) => b.score - a.score)[0]?.name || "Not enough data";

  const interviewRoles = new Map(interviews.map((interview) => [interview.id, interview.role]));
  const latestFeedback = scoreRecords[0];

  return {
    completedRounds: feedbacks.length,
    averageScore,
    latestScore: latestFeedback?.totalScore ?? null,
    latestRole: latestFeedback?.interviewId
      ? interviewRoles.get(latestFeedback.interviewId) || "Interview"
      : "Interview",
    strongestCategory,
  };
}

export function getRewardProgress(completedDays, jobApplications, internshipApplications) {
  return [
    {
      id: "coding-10",
      title: "10-Day Coder",
      category: "Coding challenge",
      target: 10,
      progress: completedDays,
    },
    {
      id: "coding-50",
      title: "Halfway Hero",
      category: "Coding challenge",
      target: 50,
      progress: completedDays,
    },
    {
      id: "coding-100",
      title: "100 Days of Code",
      category: "Coding challenge",
      target: 100,
      progress: completedDays,
    },
    {
      id: "jobs-10",
      title: "Career Starter",
      category: "Job applications",
      target: 10,
      progress: jobApplications,
    },
    {
      id: "internships-10",
      title: "Internship Seeker",
      category: "Internship applications",
      target: 10,
      progress: internshipApplications,
    },
  ].map((reward) => ({
    ...reward,
    progress: Math.min(reward.progress, reward.target),
    unlocked: reward.progress >= reward.target,
  }));
}
