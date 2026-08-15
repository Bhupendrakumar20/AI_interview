"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { getQuestionAnswer, getQuestionTips } from "@/lib/actions/mock-test.action";
import { Loader2, CheckCircle2, Lightbulb } from "lucide-react";

const getDifficultyBadge = (diff) => {
  const badges = {
    Easy: "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
    Medium: "bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30",
    Hard: "bg-rose-500/20 text-rose-600 dark:text-rose-400 border-rose-500/30",
  };
  return badges[diff] || badges["Medium"];
};

export default function QuestionCard({ question, index, company, role }) {
  const [answer, setAnswer] = useState(null);
  const [tips, setTips] = useState(null);
  const [loadingAnswer, setLoadingAnswer] = useState(false);
  const [loadingTips, setLoadingTips] = useState(false);
  const [answerError, setAnswerError] = useState(false);
  const [tipsError, setTipsError] = useState(false);

  const handleShowAnswer = async () => {
    if (answer || loadingAnswer) return;
    setLoadingAnswer(true);
    setAnswerError(false);
    try {
      const res = await getQuestionAnswer({
        question: question.question,
        company,
        role,
        difficulty: question.difficulty,
      });
      if (res.success) {
        setAnswer(res.answer);
      } else {
        setAnswerError(true);
      }
    } catch {
      setAnswerError(true);
    } finally {
      setLoadingAnswer(false);
    }
  };

  const handleShowTips = async () => {
    if (tips || loadingTips) return;
    setLoadingTips(true);
    setTipsError(false);
    try {
      const res = await getQuestionTips({
        question: question.question,
        company,
        role,
        difficulty: question.difficulty,
      });
      if (res.success) {
        setTips(res.tips);
      } else {
        setTipsError(true);
      }
    } catch {
      setTipsError(true);
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

      {(loadingAnswer || answer || answerError) && (
        <div className="mt-4 pt-4 border-t border-border">
          <p className="text-sm font-semibold text-foreground mb-1">Expected Answer</p>
          {loadingAnswer && <p className="text-sm text-muted-foreground">Generating answer…</p>}
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
          {loadingTips && <p className="text-sm text-muted-foreground">Generating tips…</p>}
          {tipsError && <p className="text-sm text-rose-500">Couldn't generate tips. Try again.</p>}
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