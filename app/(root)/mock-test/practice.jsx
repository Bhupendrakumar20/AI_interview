"use client";

import { useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getPositionsForCompany } from "@/lib/companies-data";
import QuestionCard from "@/components/QuestionCard";
import { toast } from "sonner";
import { ChevronLeft } from "lucide-react";

const DIFFICULTY_LEVELS = ["Easy", "Medium", "Hard"];

export default function PracticePage() {
  const searchParams = useSearchParams();
  const companyName = searchParams.get("company") || "Google";

  const [selectedPosition, setSelectedPosition] = useState("");
  const [selectedDifficulty, setSelectedDifficulty] = useState("Medium");
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [questionsLoaded, setQuestionsLoaded] = useState(false);

  const companyId = companyName.toLowerCase().replace(/[^a-z0-9]/g, "-");
  const positions = getPositionsForCompany(companyId);

  const requestIdRef = useRef(0);
const abortControllerRef = useRef(null);

const handleLoadQuestions = useCallback(async () => {
  if (!selectedPosition) {
    toast.error("Please select a position");
    return;
  }

  if (abortControllerRef.current) abortControllerRef.current.abort();
  const controller = new AbortController();
  abortControllerRef.current = controller;
  const myRequestId = ++requestIdRef.current;

  setLoading(true);
  setQuestions([]);
  try {
    const res = await fetch("/api/mock-test/stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        company: companyName,
        role: selectedPosition,
        difficulty: selectedDifficulty,
        questionType: "Technical",
        count: 5,
      }),
      signal: controller.signal,
    });

    if (!res.ok || !res.body) throw new Error("Failed to start question stream");

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let firstReceived = false;

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      if (myRequestId !== requestIdRef.current) { reader.cancel(); return; }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop();

      for (const line of lines) {
        if (!line.trim()) continue;
        const parsed = JSON.parse(line);
        if (parsed.error) throw new Error(parsed.error);
        if (myRequestId === requestIdRef.current) {
          setQuestions(parsed.questions);
          setQuestionsLoaded(true);
          if (!firstReceived) { setLoading(false); firstReceived = true; }
        }
      }
    }

    if (myRequestId === requestIdRef.current) {
      toast.success(`Loaded questions for ${selectedPosition} at ${companyName}`);
    }
  } catch (error) {
    if (error.name === "AbortError") return;
    console.error("Error loading questions:", error);
    toast.error("Failed to load practice questions");
    if (myRequestId === requestIdRef.current) setQuestions([]);
  } finally {
    if (myRequestId === requestIdRef.current) setLoading(false);
  }
}, [selectedPosition, selectedDifficulty, companyName]);

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
            <h2 className="text-2xl font-bold">
              Practice Questions ({questions.length}/5)
            </h2>
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
              <QuestionCard
                key={index}
                question={question}
                index={index}
                company={companyName}
                role={selectedPosition}
              />
            ))}
            {loading && questions.length < 5 && (
              <div className="flex items-center gap-2 text-sm text-light-100 py-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-200"></div>
                Generating question {questions.length + 1} of 5…
              </div>
            )}
          </div>
        </section>
      )}

      {questionsLoaded && questions.length === 0 && !loading && (
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