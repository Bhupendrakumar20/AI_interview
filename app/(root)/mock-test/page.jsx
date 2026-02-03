"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  getMockTestQuestions,
  getAvailableFilters,
} from "@/lib/actions/mock-test.action";
import {
  MOCK_TEST_COMPANIES,
  DIFFICULTY_LEVELS,
  QUESTION_TYPES,
} from "@/lib/mock-test-constants";
import QuestionCard from "@/components/QuestionCard";
import { toast } from "sonner";

export default function MockTestPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [filters, setFilters] = useState({
    company: searchParams.get("company") || "Google",
    role: searchParams.get("role") || "Software Engineer",
    difficulty: searchParams.get("difficulty") || "Medium",
    type: searchParams.get("type") || "Technical",
    count: parseInt(searchParams.get("count")) || 5,
  });

  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expandedQuestion, setExpandedQuestion] = useState(null);
  const [searchRole, setSearchRole] = useState(filters.role);

  // Load questions on filter change
  useEffect(() => {
    loadQuestions();
  }, [filters]);

  const loadQuestions = useCallback(async () => {
    setLoading(true);
    try {
      console.log("Loading questions with filters:", filters);

      const result = await getMockTestQuestions({
        company: filters.company,
        role: filters.role,
        difficulty: filters.difficulty,
        questionType: filters.type,
        count: filters.count,
      });

      if (result.success) {
        setQuestions(result.questions || []);
        toast.success(
          `Loaded ${result.totalQuestions || 0} questions for ${filters.company}`
        );
      } else {
        toast.error(result.error || "Failed to load questions");
        setQuestions([]);
      }
    } catch (error) {
      console.error("Error loading questions:", error);
      toast.error("Failed to load mock test questions");
      setQuestions([]);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const handleFilterChange = (key, value) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);

    // Update URL params
    const params = new URLSearchParams();
    Object.entries(newFilters).forEach(([k, v]) => {
      params.set(k, v);
    });
    router.push(`?${params.toString()}`, { scroll: false });
  };

  const handleRoleSearch = (value) => {
    setSearchRole(value);
    handleFilterChange("role", value);
  };

  const handleQuestionClick = (index) => {
    setExpandedQuestion(expandedQuestion === index ? null : index);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold mb-2">Mock Interview Tests</h1>
        <p className="text-light-100">
          Practice with company-specific interview questions
        </p>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 bg-dark-200 p-6 rounded-lg border border-dark-300">
        {/* Company Filter */}
        <div>
          <label className="text-sm font-semibold text-light-100 mb-2 block">
            Company
          </label>
          <select
            value={filters.company}
            onChange={(e) => handleFilterChange("company", e.target.value)}
            className="w-full px-3 py-2 bg-dark-300 border border-dark-400 rounded text-light-200 text-sm focus:outline-none focus:border-primary-200"
          >
            {MOCK_TEST_COMPANIES.map((company) => (
              <option key={company} value={company}>
                {company}
              </option>
            ))}
          </select>
        </div>

        {/* Role Filter */}
        <div>
          <label className="text-sm font-semibold text-light-100 mb-2 block">
            Role
          </label>
          <Input
            type="text"
            placeholder="e.g., Frontend Engineer"
            value={searchRole}
            onChange={(e) => handleRoleSearch(e.target.value)}
            className="bg-dark-300 border-dark-400 text-light-200 placeholder:text-light-100/50 text-sm"
          />
        </div>

        {/* Difficulty Filter */}
        <div>
          <label className="text-sm font-semibold text-light-100 mb-2 block">
            Difficulty
          </label>
          <select
            value={filters.difficulty}
            onChange={(e) => handleFilterChange("difficulty", e.target.value)}
            className="w-full px-3 py-2 bg-dark-300 border border-dark-400 rounded text-light-200 text-sm focus:outline-none focus:border-primary-200"
          >
            {DIFFICULTY_LEVELS.map((level) => (
              <option key={level} value={level}>
                {level}
              </option>
            ))}
          </select>
        </div>

        {/* Question Type Filter */}
        <div>
          <label className="text-sm font-semibold text-light-100 mb-2 block">
            Type
          </label>
          <select
            value={filters.type}
            onChange={(e) => handleFilterChange("type", e.target.value)}
            className="w-full px-3 py-2 bg-dark-300 border border-dark-400 rounded text-light-200 text-sm focus:outline-none focus:border-primary-200"
          >
            {QUESTION_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>

        {/* Count Filter */}
        <div>
          <label className="text-sm font-semibold text-light-100 mb-2 block">
            Questions
          </label>
          <select
            value={filters.count}
            onChange={(e) =>
              handleFilterChange("count", parseInt(e.target.value))
            }
            className="w-full px-3 py-2 bg-dark-300 border border-dark-400 rounded text-light-200 text-sm focus:outline-none focus:border-primary-200"
          >
            {[3, 5, 7, 10].map((count) => (
              <option key={count} value={count}>
                {count}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Test Info */}
      <div className="flex items-center justify-between p-4 bg-primary-200/10 border border-primary-200/30 rounded-lg">
        <div>
          <p className="text-light-200">
            <strong>{filters.company}</strong> • {filters.role} •{" "}
            <span className="capitalize">{filters.difficulty}</span> •{" "}
            {filters.type}
          </p>
        </div>
        <p className="text-sm text-light-100">{questions.length} questions</p>
      </div>

      {/* Questions */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-200"></div>
        </div>
      ) : questions.length === 0 ? (
        <div className="bg-dark-200 border border-dark-300 p-8 rounded-lg text-center text-light-100">
          <p>No questions loaded. Adjust filters and try again.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {questions.map((q, index) => (
            <QuestionCard
              key={index}
              question={q}
              index={index}
              isExpanded={expandedQuestion === index}
              onToggle={() => handleQuestionClick(index)}
              company={filters.company}
            />
          ))}
        </div>
      )}

      {/* Start Test Button */}
      {questions.length > 0 && (
        <div className="flex gap-4">
          <Button className="btn-primary flex-1 py-3 text-lg">
            Start Full Test
          </Button>
          <Button className="btn-secondary flex-1 py-3 text-lg">
            Download Questions
          </Button>
        </div>
      )}
    </div>
  );
}
