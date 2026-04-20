// components/QuestionCard.jsx
import { Button } from "@/components/ui/button";

const QuestionCard = ({
  question,
  index,
  isExpanded,
  onToggle,
  company,
}) => {
  const getDifficultyColor = (difficulty) => {
    switch (difficulty?.toLowerCase()) {
      case "easy":
        return "bg-green-500/20 text-green-300 border-green-500/30";
      case "medium":
        return "bg-yellow-500/20 text-yellow-300 border-yellow-500/30";
      case "hard":
        return "bg-red-500/20 text-red-300 border-red-500/30";
      default:
        return "bg-primary-200/20 text-primary-200 border-primary-200/30";
    }
  };

  return (
    <div className="card-border">
      <div className="card p-5">
        {/* Question Header */}
        <div
          className="cursor-pointer"
          onClick={onToggle}
        >
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-sm font-semibold text-primary-200">
                  Question {index + 1}
                </span>
                <span
                  className={`text-xs px-3 py-1 rounded-full border ${getDifficultyColor(
                    question.difficulty
                  )}`}
                >
                  {question.difficulty || "Medium"}
                </span>
              </div>
              <h3 className="text-lg font-bold text-light-200 hover:text-primary-200 transition">
                {question.question}
              </h3>
            </div>
            <button className="text-primary-200 text-xl ml-4">
              {isExpanded ? "−" : "+"}
            </button>
          </div>
        </div>

        {/* Expanded Content */}
        {isExpanded && (
          <div className="border-t border-dark-300 pt-6 mt-4 space-y-6">
            {/* Expected Answer */}
            <div>
              <h4 className="text-sm font-bold text-light-100 mb-3 uppercase tracking-wider">
                Expected Answer / Approach
              </h4>
              <div className="bg-dark-300/50 border border-dark-400 rounded p-4 text-light-200 text-sm leading-relaxed whitespace-pre-wrap">
                {question.expectedAnswer}
              </div>
            </div>

            {/* Tips */}
            {question.tips && Array.isArray(question.tips) && question.tips.length > 0 && (
              <div>
                <h4 className="text-sm font-bold text-light-100 mb-3 uppercase tracking-wider">
                  Tips for Success
                </h4>
                <ul className="space-y-2">
                  {question.tips.map((tip, tipIndex) => (
                    <li key={tipIndex} className="flex gap-3 text-sm text-light-200">
                      <span className="text-primary-200 font-bold flex-shrink-0">
                        {tipIndex + 1}.
                      </span>
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Company Context */}
            <div className="bg-primary-200/10 border border-primary-200/30 rounded p-4">
              <p className="text-sm text-light-200">
                <span className="font-semibold text-primary-200">
                  {company} Context:
                </span>{" "}
                This question tests skills commonly evaluated at {company}.
                Focus on clarity, technical depth, and real-world application.
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4 border-t border-dark-300">
              <Button className="btn-primary flex-1">
                Practice This Question
              </Button>
              <Button className="btn-secondary">
                Save for Later
              </Button>
            </div>
          </div>
        )}

        {/* Collapsed State - Preview */}
        {!isExpanded && (
          <div className="text-sm text-light-100/60 mt-2">
            Click to view expected answer and tips
          </div>
        )}
      </div>
    </div>
  );
};

export default QuestionCard;
