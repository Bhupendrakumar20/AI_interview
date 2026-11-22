"use client";

import { useState, useEffect } from "react";
import { QUESTION_BANK, QUESTION_CATEGORIES } from "@/constants/questionBank";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  CheckboxStrike,
  BookmarkSave,
  CopyLinkButton,
  SegmentControl,
} from "@/components/ui/MicroInteractions";

const QuestionBank = ({ initialCategory = "general" }) => {
  const [activeKey, setActiveKey] = useState(initialCategory);
  const [solvedQuestions, setSolvedQuestions] = useState({});
  const [bookmarkedQuestions, setBookmarkedQuestions] = useState({});

  // Persist solved & bookmarked questions locally
  useEffect(() => {
    try {
      const savedSolved = localStorage.getItem("qb_solved");
      const savedBookmarks = localStorage.getItem("qb_bookmarks");
      if (savedSolved) setSolvedQuestions(JSON.parse(savedSolved));
      if (savedBookmarks) setBookmarkedQuestions(JSON.parse(savedBookmarks));
    } catch {}
  }, []);

  const toggleSolved = (qKey) => {
    setSolvedQuestions((prev) => {
      const updated = { ...prev, [qKey]: !prev[qKey] };
      try {
        localStorage.setItem("qb_solved", JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const toggleBookmark = (qKey, isSaved) => {
    setBookmarkedQuestions((prev) => {
      const updated = { ...prev, [qKey]: isSaved };
      try {
        localStorage.setItem("qb_bookmarks", JSON.stringify(updated));
      } catch {}
      return updated;
    });
    if (isSaved) {
      toast.success("Question bookmarked!");
    } else {
      toast.info("Removed from bookmarks");
    }
  };

  const activeCategory = QUESTION_BANK[activeKey] ?? QUESTION_BANK.general;
  const questions = activeCategory.questions ?? [];

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Left: Category list */}
      <aside className="w-full lg:w-80 shrink-0">
        <div className="card-border w-full">
          <div className="card p-4 flex flex-col gap-3">
            <div>
              <h3 className="text-xl font-bold mb-1 text-foreground">Categories</h3>
              <p className="text-xs text-muted-foreground">
                Choose a job track to view curated interview questions.
              </p>
            </div>

            <div className="flex flex-col gap-2 max-h-[580px] overflow-y-auto pr-1">
              {QUESTION_CATEGORIES.map((cat) => {
                const isActive = activeKey === cat.key;
                const questionCount = QUESTION_BANK[cat.key]?.questions?.length || 0;

                return (
                  <button
                    key={cat.key}
                    type="button"
                    onClick={() => setActiveKey(cat.key)}
                    className={cn(
                      "w-full text-left px-3.5 py-3 rounded-xl border transition-all duration-200 cursor-pointer flex items-center justify-between gap-2",
                      isActive
                        ? "bg-primary text-primary-foreground border-primary font-bold shadow-sm shadow-primary/20 scale-[1.01]"
                        : "bg-secondary/40 border-border/70 hover:bg-secondary/80 text-foreground hover:border-primary/40"
                    )}
                  >
                    <span className="text-sm font-medium leading-snug truncate">
                      {cat.title}
                    </span>
                    <span
                      className={cn(
                        "text-[11px] font-semibold px-2 py-0.5 rounded-md shrink-0",
                        isActive
                          ? "bg-primary-foreground/20 text-primary-foreground"
                          : "bg-secondary text-muted-foreground"
                      )}
                    >
                      {questionCount} Qs
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </aside>

      {/* Right: Question list */}
      <section className="flex-1 min-w-0">
        <div className="card-border w-full">
          <div className="card p-5 flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <h3 className="text-2xl font-semibold text-foreground">
                {activeCategory.title}
              </h3>
              {activeCategory.description && (
                <p className="text-sm text-muted-foreground">
                  {activeCategory.description}
                </p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                Total questions: {questions.length} • Solved:{" "}
                {questions.filter((_, idx) => solvedQuestions[`${activeKey}-${idx}`]).length}
              </p>
            </div>

            <div className="flex flex-col gap-3 max-h-[580px] overflow-y-auto pr-1">
              {questions.map((q, index) => {
                const qKey = `${activeKey}-${index}`;
                const isSolved = !!solvedQuestions[qKey];
                const isBookmarked = !!bookmarkedQuestions[qKey];

                return (
                  <div
                    key={qKey}
                    className={cn(
                      "rounded-xl border p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-all duration-200",
                      isSolved
                        ? "bg-muted/30 border-border/40 opacity-75"
                        : "bg-card border-border/70 hover:border-primary/40 shadow-xs"
                    )}
                  >
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <CheckboxStrike
                        checked={isSolved}
                        onChange={() => toggleSolved(qKey)}
                        className="mt-0.5"
                      />
                      <div className="flex-1 min-w-0">
                        <p
                          className={cn(
                            "text-sm leading-relaxed transition-all duration-200",
                            isSolved
                              ? "line-through text-muted-foreground"
                              : "text-foreground font-medium"
                          )}
                        >
                          <span className="text-primary font-bold mr-1.5">
                            {index + 1}.
                          </span>
                          {q}
                        </p>
                      </div>
                    </div>

                    {/* Micro-Interaction Actions */}
                    <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                      <BookmarkSave
                        active={isBookmarked}
                        onToggle={(state) => toggleBookmark(qKey, state)}
                      />
                      <CopyLinkButton
                        text={q}
                        label="Copy"
                        className="py-1 px-2.5"
                      />
                    </div>
                  </div>
                );
              })}

              {questions.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No questions added yet for this category.
                </p>
              )}
            </div>

            <p className="text-[11px] text-muted-foreground mt-1">
              Tip: Check the box to track practiced questions. Bookmarked items stay saved in your browser.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default QuestionBank;
