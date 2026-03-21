// /components/DailyQuestionSection.jsx
// Component to display LeetCode's daily challenge question

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Calendar, Zap, Users, TrendingUp } from "lucide-react";

const getDifficultyColor = (difficulty) => {
  switch (difficulty?.toLowerCase()) {
    case "easy":
      return {
        bg: "bg-green-50 dark:bg-green-900/20",
        text: "text-green-700 dark:text-green-400",
        border: "border-green-200 dark:border-green-700",
      };
    case "medium":
      return {
        bg: "bg-yellow-50 dark:bg-yellow-900/20",
        text: "text-yellow-700 dark:text-yellow-400",
        border: "border-yellow-200 dark:border-yellow-700",
      };
    case "hard":
      return {
        bg: "bg-red-50 dark:bg-red-900/20",
        text: "text-red-700 dark:text-red-400",
        border: "border-red-200 dark:border-red-700",
      };
    default:
      return {
        bg: "bg-gray-50 dark:bg-gray-900/20",
        text: "text-gray-700 dark:text-gray-400",
        border: "border-gray-200 dark:border-gray-700",
      };
  }
};

export default function DailyQuestionSection() {
  const [dailyQuestion, setDailyQuestion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDailyQuestion = async () => {
      try {
        setLoading(true);
        const response = await fetch("/api/leetcode/daily-question");

        if (!response.ok) {
          throw new Error("Failed to fetch daily question");
        }

        const data = await response.json();

        if (data.success) {
          setDailyQuestion(data);
          setError(null);
        } else {
          setError(data.error || "Failed to fetch daily question");
        }
      } catch (err) {
        console.error("Error fetching daily question:", err);
        setError(err.message || "Unable to load today's challenge");
      } finally {
        setLoading(false);
      }
    };

    fetchDailyQuestion();
  }, []);

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-dark-200/50 to-dark-250/50 backdrop-blur-sm border border-white/10 rounded-2xl p-8 mb-8 animate-pulse">
        <div className="flex items-center justify-center">
          <div className="text-center">
            <div className="h-6 w-48 bg-dark-300 rounded-lg mx-auto mb-2"></div>
            <div className="h-4 w-64 bg-dark-300 rounded-lg mx-auto"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-2xl p-6 mb-8">
        <div className="flex items-start gap-4">
          <div className="text-red-600 dark:text-red-400">
            <AlertIcon className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-semibold text-red-900 dark:text-red-100 mb-1">
              Unable to Load Daily Challenge
            </h3>
            <p className="text-red-700 dark:text-red-300 text-sm">
              {error}. Please try again later.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!dailyQuestion || !dailyQuestion.question) {
    return null;
  }

  const { question, date } = dailyQuestion;
  const difficultyColors = getDifficultyColor(question.difficulty);

  const formattedDate = new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="mb-8">
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          <Zap className="w-5 h-5 text-yellow-500" />
          <h2 className="text-xl font-bold text-white">Today's Challenge</h2>
        </div>
        <p className="text-light-400 text-sm">
          Complete the daily LeetCode challenge to improve your skills
        </p>
      </div>

      <div className="bg-gradient-to-br from-dark-200/50 to-dark-250/50 backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:border-primary-200/30 transition-all duration-300">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6 pb-6 border-b border-white/10">
          <div className="flex-1">
            <h3 className="text-2xl font-bold text-white mb-2">
              {question.title}
            </h3>
            <div className="flex items-center gap-2 text-light-400 text-sm">
              <Calendar className="w-4 h-4" />
              <span>{formattedDate}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div
              className={`px-4 py-2 rounded-lg font-semibold text-sm ${difficultyColors.bg} ${difficultyColors.text} border ${difficultyColors.border}`}
            >
              {question.difficulty}
            </div>
          </div>
        </div>

        {/* Topics */}
        {question.topics && question.topics.length > 0 && (
          <div className="mb-6">
            <h4 className="text-sm font-semibold text-light-200 mb-2">
              Topics
            </h4>
            <div className="flex flex-wrap gap-2">
              {question.topics.map((topic) => (
                <span
                  key={topic.slug}
                  className="px-3 py-1 bg-primary-200/20 text-primary-200 rounded-full text-xs font-medium"
                >
                  {topic.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Call to Action */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            href={question.leetcodeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 bg-gradient-to-r from-primary-200 to-primary-300 text-dark-100 hover:from-primary-100 hover:to-primary-200 font-bold py-3 px-6 rounded-full transition-all duration-300 text-center hover:scale-105 active:scale-95"
          >
            Solve on LeetCode →
          </Link>

          <button
            onClick={() => window.open(question.leetcodeUrl, "_blank")}
            className="bg-dark-300 text-primary-200 hover:bg-dark-250 font-bold py-3 px-6 rounded-full transition-all duration-300 border border-primary-200/20 hover:scale-105 active:scale-95"
          >
            View Details
          </button>
        </div>

        {/* Footer Stats */}
        <div className="mt-6 pt-6 border-t border-white/10 grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="text-center">
            <TrendingUp className="w-5 h-5 text-primary-200 mx-auto mb-2" />
            <p className="text-xs text-light-400">Daily Challenge</p>
            <p className="text-sm font-semibold text-white">
              Complete for reward
            </p>
          </div>

          <div className="text-center">
            <Users className="w-5 h-5 text-primary-200 mx-auto mb-2" />
            <p className="text-xs text-light-400">Community</p>
            <p className="text-sm font-semibold text-white">
              Join thousands
            </p>
          </div>

          <div className="text-center md:col-span-1">
            <Zap className="w-5 h-5 text-yellow-500 mx-auto mb-2" />
            <p className="text-xs text-light-400">Streak</p>
            <p className="text-sm font-semibold text-white">
              Build your streak
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Alert icon component
function AlertIcon(props) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      {...props}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 9v2m0 4v2m0 0v2m0-6v-2m0 0V7a2 2 0 012-2h2.586a1 1 0 00.707-.293l-2.414-2.414a1 1 0 00-1.414 1.414L10.586 7H12a1 1 0 001-1V5"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M13 16h-1v-4h-1m.667-4h.666"
      />
    </svg>
  );
}
