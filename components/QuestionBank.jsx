"use client";

import { useState } from "react";
import { QUESTION_BANK, QUESTION_CATEGORIES } from "@/constants/questionBank";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const QuestionBank = ({ initialCategory = "general" }) => {
  const [activeKey, setActiveKey] = useState(initialCategory);

  const activeCategory = QUESTION_BANK[activeKey] ?? QUESTION_BANK.general;
  const questions = activeCategory.questions ?? [];

  const handleCopy = async (q) => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(q);
        // optional: simple toast replacement
        console.log("Copied:", q);
      }
    } catch (err) {
      console.error("Copy failed", err);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Left: Category list */}
      <aside className="w-full lg:w-72 flex-shrink-0">
        <div className="card-border w-full">
          <div className="card p-4 flex flex-col gap-3">
            <h3 className="text-xl font-semibold mb-1">Categories</h3>
            <p className="text-xs text-light-100 mb-2">
              Choose a job area to view the most frequently asked interview
              questions.
            </p>

            <div className="flex flex-col gap-2 max-h-[420px] overflow-y-auto pr-1">
              {QUESTION_CATEGORIES.map((cat) => (
                <button
                  key={cat.key}
                  type="button"
                  onClick={() => setActiveKey(cat.key)}
                  className={cn(
                    "w-full text-left text-sm px-3 py-2 rounded-xl border transition-all",
                    activeKey === cat.key
                      ? "bg-primary-200 text-dark-100 border-primary-200 font-semibold"
                      : "bg-dark-200 border-input hover:bg-dark-200/80"
                  )}
                >
                  <div className="flex flex-col gap-0.5">
                    <span>{cat.title}</span>
                    {cat.description && (
                      <span className="text-[11px] text-light-100 line-clamp-2">
                        {cat.description}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </aside>

      {/* Right: Question list */}
      <section className="flex-1 min-w-0">
        <div className="card-border w-full">
          <div className="card p-5 flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <h3 className="text-2xl font-semibold">
                {activeCategory.title}
              </h3>
              {activeCategory.description && (
                <p className="text-sm text-light-100">
                  {activeCategory.description}
                </p>
              )}
              <p className="text-xs text-light-100 mt-1">
                Total questions: {questions.length}
              </p>
            </div>

            <div className="flex flex-col gap-3 max-h-[540px] overflow-y-auto pr-1">
              {questions.map((q, index) => (
                <div
                  key={`${activeKey}-${index}`}
                  className="rounded-xl border border-input bg-dark-200 px-4 py-3 flex items-start justify-between gap-3"
                >
                  <div className="flex-1">
                    <p className="text-sm leading-relaxed">
                      <span className="text-primary-200 mr-1">
                        {index + 1}.
                      </span>
                      {q}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-xs min-w-[60px]"
                    onClick={() => handleCopy(q)}
                  >
                    Copy
                  </Button>
                </div>
              ))}

              {questions.length === 0 && (
                <p className="text-sm text-light-100">
                  No questions added yet for this category.
                </p>
              )}
            </div>

            <p className="text-[11px] text-light-100 mt-1">
              Tip: These questions can also be mixed into your AI-generated
              interviews based on the selected role/track.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};

export default QuestionBank;
