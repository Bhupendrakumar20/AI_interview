"use client";

import { useState, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  getMockTestQuestions,
} from "@/lib/actions/mock-test.action";
import { getPositionsForCompany, getCompanyById } from "@/lib/companies-data";
import QuestionCard from "@/components/QuestionCard";
import { toast } from "sonner";
import { ChevronLeft } from "lucide-react";

const DIFFICULTY_LEVELS = ["Easy", "Medium", "Hard"];

export default function PracticePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const companyName = searchParams.get("company") || "Google";

  const [selectedPosition, setSelectedPosition] = useState("");
  const [selectedDifficulty, setSelectedDifficulty] = useState("Medium");
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [questionsLoaded, setQuestionsLoaded] = useState(false);
  const [expandedQuestion, setExpandedQuestion] = useState(null);

  const companyId = companyName.toLowerCase().replace(/[^a-z0-9]/g, "-");
  const positions = getPositionsForCompany(companyId);

  const handleLoadQuestions = useCallback(async () => {
    if (!selectedPosition) {
      toast.error("Please select a position");
      return;
    }

    setLoading(true);
    try {
      const result = await getMockTestQuestions({
        company: companyName,
        role: selectedPosition,
        difficulty: selectedDifficulty,
        questionType: "Technical",
        count: 5,
      });

      if (result.success) {
        setQuestions(result.questions || []);
        setQuestionsLoaded(true);
        toast.success(
          `Loaded ${result.totalQuestions || 0} questions for ${selectedPosition} at ${companyName}`
        );
      } else {
        toast.error(result.error || "Failed to load questions");
        setQuestions([]);
      }
    } catch (error) {
      console.error("Error loading questions:", error);
      toast.error("Failed to load practice questions");
      setQuestions([]);
    } finally {
      setLoading(false);
    }
  }, [selectedPosition, selectedDifficulty, companyName]);

  const handleQuestionClick = (index) => {
    setExpandedQuestion(expandedQuestion === index ? null : index);
  };

  return (
    <div className="space-y-8">
      {/* Back Button */}
      <div className="flex items-center gap-2">
        <Link href="/mock-test">
          <Button className="flex items-center gap-2 bg-light-400 hover:bg-light-300 text-light-900">
            <ChevronLeft size={18} />
            Back to Companies
          </Button>
        </Link>
      </div>

      {/* Header */}
      <section>
        <h1 className="text-4xl font-bold mb-2">
          {companyName} Interview Practice
        </h1>
        <p className="text-light-100 text-lg">
          Select a position and difficulty level to get started
        </p>
      </section>

      {/* Practice Setup */}
      <section className="card-border">
        <div className="card p-6 space-y-6">
          {/* Position Selection */}
          <div>
            <label className="block text-sm font-semibold text-light-900 mb-3">
              Select Position
            </label>
            {positions.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {positions.map((position, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedPosition(position.title)}
                    className={`p-3 rounded-lg border-2 transition-all text-left ${
                      selectedPosition === position.title
                        ? "border-primary-200 bg-primary-200 bg-opacity-10"
                        : "border-light-300 hover:border-light-200"
                    }`}
                  >
                    <p className="font-medium text-light-900">{position.title}</p>
                    <p className="text-sm text-light-100">{position.level} Level</p>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-light-100">No positions available for this company</p>
            )}
          </div>

          {/* Difficulty Selection */}
          <div>
            <label className="block text-sm font-semibold text-light-900 mb-3">
              Select Difficulty
            </label>
            <div className="grid grid-cols-3 gap-3">
              {DIFFICULTY_LEVELS.map((level) => (
                <button
                  key={level}
                  onClick={() => setSelectedDifficulty(level)}
                  className={`p-3 rounded-lg border-2 transition-all font-medium ${
                    selectedDifficulty === level
                      ? "border-primary-200 bg-primary-200 bg-opacity-10 text-primary-200"
                      : "border-light-300 text-light-900 hover:border-light-200"
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>

          {/* Load Questions Button */}
          {!questionsLoaded && (
            <Button
              onClick={handleLoadQuestions}
              disabled={!selectedPosition || loading}
              className="w-full bg-primary-200 hover:bg-primary-100 text-white disabled:opacity-50 py-3 text-base font-semibold"
            >
              {loading ? "Loading Questions..." : "Load Practice Questions"}
            </Button>
          )}
        </div>
      </section>

      {/* Questions Display */}
      {questionsLoaded && questions.length > 0 && (
        <section className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Practice Questions</h2>
            <Button
              onClick={() => {
                setQuestionsLoaded(false);
                setQuestions([]);
              }}
              className="bg-light-400 hover:bg-light-300 text-light-900"
            >
              Change Position
            </Button>
          </div>

          <div className="space-y-4">
            {questions.map((question, index) => (
              <div key={index} className="card-border">
                <div
                  onClick={() => handleQuestionClick(index)}
                  className="card p-4 cursor-pointer hover:bg-light-300 transition-colors"
                >
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-light-900 text-lg">
                        Question {index + 1}
                      </h3>
                      {expandedQuestion !== index && (
                        <p className="text-light-100 text-sm mt-2 line-clamp-2">
                          {question.question || question.title}
                        </p>
                      )}
                    </div>
                  </div>

                  {expandedQuestion === index && (
                    <div className="mt-4 space-y-3">
                      <div>
                        <p className="text-light-900 font-semibold">Question:</p>
                        <p className="text-light-100 mt-2">
                          {question.question || question.title}
                        </p>
                      </div>

                      {question.hint && (
                        <div>
                          <p className="text-light-900 font-semibold">Hint:</p>
                          <p className="text-light-100 mt-2">{question.hint}</p>
                        </div>
                      )}

                      {question.example && (
                        <div>
                          <p className="text-light-900 font-semibold">Example:</p>
                          <pre className="bg-light-300 p-3 rounded mt-2 text-sm text-light-100 overflow-x-auto">
                            {question.example}
                          </pre>
                        </div>
                      )}

                      <Button className="w-full bg-primary-200 hover:bg-primary-100 text-white mt-4">
                        Practice this Question
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {questionsLoaded && questions.length === 0 && (
        <div className="card-border text-center py-12">
          <div className="card p-8">
            <p className="text-light-100 mb-4">
              No questions available for this selection. Please try another position or difficulty level.
            </p>
            <Button
              onClick={() => {
                setQuestionsLoaded(false);
                setQuestions([]);
              }}
              className="bg-primary-200 hover:bg-primary-100 text-white"
            >
              Try Again
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
