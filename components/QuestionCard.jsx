"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, Lightbulb } from "lucide-react";

async function streamMockTestResponse({ responseType, question, company, role, difficulty, signal, onToken, onComplete }) {
  const response = await fetch("/api/mock-test/stream", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ responseType, question, company, role, difficulty }),
    signal,
  });
  if (!response.ok || !response.body) {
    throw new Error("Failed to start response stream");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let completed = false;

  const processLine = (line) => {
    if (!line.trim()) return;
    const event = JSON.parse(line);
    if (event.error) throw new Error(event.error);
    if (event.type === "response_token") onToken(event.text);
    if (event.type === "response_complete") {
      completed = true;
      onComplete(event.value);
    }
  };

  while (true) {
    const { value, done } = await reader.read();
    buffer += decoder.decode(value || new Uint8Array(), { stream: !done });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) processLine(line);
    if (done) break;
  }
  if (buffer.trim()) processLine(buffer);
  if (!completed) throw new Error("Response stream ended before completion");
}

const getDifficultyBadge = (diff) => {
  const badges = {
    Easy: "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
    Medium: "bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30",
    Hard: "bg-rose-500/20 text-rose-600 dark:text-rose-400 border-rose-500/30",
  };
  return badges[diff] || badges["Medium"];
};

export default function QuestionCard({ question, index, company, role, isStreaming = false }) {
  const [answer, setAnswer] = useState(null);
  const [tips, setTips] = useState(null);
  const [loadingAnswer, setLoadingAnswer] = useState(false);
  const [loadingTips, setLoadingTips] = useState(false);
  const [answerError, setAnswerError] = useState(false);
  const [tipsError, setTipsError] = useState(false);
  const [streamingTips, setStreamingTips] = useState("");
  const answerAbortRef = useRef(null);
  const tipsAbortRef = useRef(null);

  useEffect(() => () => {
    answerAbortRef.current?.abort();
    tipsAbortRef.current?.abort();
  }, []);

  const handleShowAnswer = async () => {
    if ((answer && !answerError) || loadingAnswer) return;
    const controller = new AbortController();
    answerAbortRef.current = controller;
    setLoadingAnswer(true);
    setAnswerError(false);
    setAnswer("");
    try {
      await streamMockTestResponse({
        responseType: "answer",
        question: question.question,
        company,
        role,
        difficulty: question.difficulty,
        signal: controller.signal,
        onToken: (text) => setAnswer((current) => current + text),
        onComplete: setAnswer,
      });
    } catch (error) {
      if (error.name !== "AbortError") setAnswerError(true);
    } finally {
      setLoadingAnswer(false);
    }
  };

  const handleShowTips = async () => {
    if (tips || loadingTips) return;
    const controller = new AbortController();
    tipsAbortRef.current = controller;
    setLoadingTips(true);
    setTipsError(false);
    setTips(null);
    setStreamingTips("");
    try {
      await streamMockTestResponse({
        responseType: "tips",
        question: question.question,
        company,
        role,
        difficulty: question.difficulty,
        signal: controller.signal,
        onToken: (text) => setStreamingTips((current) => current + text),
        onComplete: (value) => {
          setTips(value);
          setStreamingTips("");
        },
      });
    } catch (error) {
      if (error.name !== "AbortError") setTipsError(true);
    } finally {
      setLoadingTips(false);
    }
  };

  return (
    <div className="rounded-lg border border-border bg-card p-5 shadow-sm">
      <div className="flex items-center gap-3 mb-2">
        <span className="text-sm font-bold text-primary">Q{index + 1}</span>
        <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${getDifficultyBadge(question.difficulty)}`}>
          {question.difficulty || "Medium"}
        </span>
      </div>

      <p className="text-foreground font-medium mb-4">{question.question}</p>

      {!isStreaming && (
        <div className="flex flex-wrap gap-3">
          <Button
            size="sm"
            onClick={handleShowAnswer}
            disabled={loadingAnswer}
            className="flex items-center gap-2 bg-primary-200 hover:bg-primary-100 text-white"
          >
            {loadingAnswer ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
            Expected Answer
          </Button>
          <Button
            size="sm"
            onClick={handleShowTips}
            disabled={loadingTips}
            className="flex items-center gap-2 bg-light-400 hover:bg-light-300 text-light-900"
          >
            {loadingTips ? <Loader2 size={14} className="animate-spin" /> : <Lightbulb size={14} />}
            Tips
          </Button>
        </div>
      )}

      {(loadingAnswer || answer || answerError) && (
        <div className="mt-4 pt-4 border-t border-border">
          <p className="text-sm font-semibold text-foreground mb-1">Expected Answer</p>
          {loadingAnswer && !answer && <p className="text-sm text-muted-foreground">Generating answer…</p>}
          {answerError && <p className="text-sm text-rose-500">Couldn't generate an answer. Try again.</p>}
          {answer && (
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{answer}</p>
          )}
        </div>
      )}

      {(loadingTips || tips || tipsError) && (
        <div className="mt-4 pt-4 border-t border-border">
          <p className="text-sm font-semibold text-foreground mb-1 flex items-center gap-1.5">
            <Lightbulb size={14} className="text-amber-500" /> Tips
          </p>
          {loadingTips && !streamingTips && <p className="text-sm text-muted-foreground">Generating tips…</p>}
          {tipsError && <p className="text-sm text-rose-500">Couldn't generate tips. Try again.</p>}
          {streamingTips && (
            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{streamingTips}</p>
          )}
          {tips && (
            <ul className="space-y-1">
              {tips.map((t, i) => (
                <li key={i} className="text-sm text-muted-foreground">• {t}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}