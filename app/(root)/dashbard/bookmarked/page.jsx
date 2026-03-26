// app/(root)/dashboard/bookmarked/page.jsx
import { Button } from "@/components/ui/button";

export default function BookmarkedPage() {
  const bookmarkedQuestions = [
    {
      id: 1,
      question: "Explain the Virtual DOM in React and how it improves performance.",
      category: "React",
      difficulty: "Medium",
      tags: ["React", "Virtual DOM", "Performance"],
      addedAt: "2024-03-20",
      notes: "Practice with reconciliation algorithm example",
      lastPracticed: "2024-03-22",
      practiceCount: 3
    },
    {
      id: 2,
      question: "Design a URL shortening service like TinyURL.",
      category: "System Design",
      difficulty: "Hard",
      tags: ["System Design", "Scalability", "Database"],
      addedAt: "2024-03-18",
      notes: "Focus on hash generation and collision handling",
      lastPracticed: "2024-03-19",
      practiceCount: 2
    },
    {
      id: 3,
      question: "Implement LRU Cache with O(1) operations.",
      category: "Data Structures",
      difficulty: "Medium",
      tags: ["DSA", "Cache", "Linked List"],
      addedAt: "2024-03-15",
      notes: "Use HashMap + Doubly Linked List approach",
      lastPracticed: "2024-03-16",
      practiceCount: 5
    },
    {
      id: 4,
      question: "What are your strengths and weaknesses?",
      category: "Behavioral",
      difficulty: "Easy",
      tags: ["Behavioral", "Communication", "Self-assessment"],
      addedAt: "2024-03-10",
      notes: "Prepare 3 strengths with examples, 1 weakness with improvement plan",
      lastPracticed: "2024-03-12",
      practiceCount: 4
    },
    {
      id: 5,
      question: "Explain event delegation in JavaScript.",
      category: "JavaScript",
      difficulty: "Medium",
      tags: ["JavaScript", "Events", "DOM"],
      addedAt: "2024-03-05",
      notes: "Use bubbling phase, single event listener on parent",
      lastPracticed: "2024-03-08",
      practiceCount: 2
    },
    {
      id: 6,
      question: "How would you handle a conflict with a teammate?",
      category: "Behavioral",
      difficulty: "Medium",
      tags: ["Behavioral", "Teamwork", "Conflict"],
      addedAt: "2024-03-01",
      notes: "STAR method: Situation, Task, Action, Result",
      lastPracticed: "2024-03-03",
      practiceCount: 3
    }
  ];

  const categories = [
    { name: "All", count: bookmarkedQuestions.length },
    { name: "React", count: bookmarkedQuestions.filter(q => q.category === "React").length },
    { name: "System Design", count: bookmarkedQuestions.filter(q => q.category === "System Design").length },
    { name: "DSA", count: bookmarkedQuestions.filter(q => q.category === "Data Structures").length },
    { name: "JavaScript", count: bookmarkedQuestions.filter(q => q.category === "JavaScript").length },
    { name: "Behavioral", count: bookmarkedQuestions.filter(q => q.category === "Behavioral").length },
  ];

  const stats = {
    total: bookmarkedQuestions.length,
    practiced: bookmarkedQuestions.filter(q => q.practiceCount > 0).length,
    highPriority: bookmarkedQuestions.filter(q => q.difficulty === "Hard").length,
    readyForReview: bookmarkedQuestions.filter(q => q.lastPracticed && new Date(q.lastPracticed) < new Date('2024-03-10')).length
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Bookmarked Questions</h1>
          <p className="text-light-100">Practice and review important interview questions</p>
        </div>
        <Button className="btn-primary">+ Add Question</Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card-border">
          <div className="card p-4 text-center">
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-sm text-light-100">Total Questions</div>
          </div>
        </div>
        <div className="card-border">
          <div className="card p-4 text-center">
            <div className="text-2xl font-bold text-primary-200">{stats.practiced}</div>
            <div className="text-sm text-light-100">Practiced</div>
          </div>
        </div>
        <div className="card-border">
          <div className="card p-4 text-center">
            <div className="text-2xl font-bold text-success-100">{stats.highPriority}</div>
            <div className="text-sm text-light-100">High Priority</div>
          </div>
        </div>
        <div className="card-border">
          <div className="card p-4 text-center">
            <div className="text-2xl font-bold">{stats.readyForReview}</div>
            <div className="text-sm text-light-100">Need Review</div>
          </div>
        </div>
      </div>

      {/* Categories */}
      <div className="flex flex-wrap gap-2">
        {categories.map((category) => (
          <button
            key={category.name}
            className="px-4 py-2 bg-dark-200 text-light-100 rounded-full hover:bg-dark-300"
          >
            {category.name} ({category.count})
          </button>
        ))}
      </div>

      {/* Questions Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {bookmarkedQuestions.map((question) => (
          <div key={question.id} className="card-border">
            <div className="card p-4">
              <h4 className="font-bold text-lg mb-2">{question.question}</h4>
              <p className="text-sm text-light-100 mb-2">Category: {question.category}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Practice Session */}
      <div className="card-border">
        <div className="card p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold mb-2">Start Practice Session</h2>
              <p className="text-light-100">Practice bookmarked questions with AI feedback</p>
            </div>
            <div className="flex gap-3">
              <Button className="btn-secondary">Custom Practice</Button>
              <Button className="btn-primary">Start Random Practice</Button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div className="text-center p-4 bg-dark-200 rounded-lg">
              <div className="text-lg font-bold">10</div>
              <div className="text-sm text-light-100">Questions Ready</div>
            </div>
            <div className="text-center p-4 bg-dark-200 rounded-lg">
              <div className="text-lg font-bold">45 min</div>
              <div className="text-sm text-light-100">Estimated Time</div>
            </div>
            <div className="text-center p-4 bg-dark-200 rounded-lg">
              <div className="text-lg font-bold">Mixed</div>
              <div className="text-sm text-light-100">Difficulty</div>
            </div>
          </div>
        </div>
      </div>

      {/* Study Tips */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card-border">
          <div className="card p-4">
            <div className="text-2xl mb-2">✍</div>
            <h3 className="font-semibold mb-2">Take Notes</h3>
            <p className="text-sm text-light-100">Add personal notes to each question</p>
          </div>
        </div>
        <div className="card-border">
          <div className="card p-4">
            <div className="text-2xl mb-2">⟳</div>
            <h3 className="font-semibold mb-2">Regular Review</h3>
            <p className="text-sm text-light-100">Review questions weekly</p>
          </div>
        </div>
        <div className="card-border">
          <div className="card p-4">
            <div className="text-2xl mb-2">▲</div>
            <h3 className="font-semibold mb-2">Focus Areas</h3>
            <p className="text-sm text-light-100">Identify and work on weak areas</p>
          </div>
        </div>
      </div>
    </div>
  );
}