"use client";

import { useState, useMemo } from "react";
import { getAllDays, searchQuestions, getQuestionsByTopic, getQuestionsByDifficulty } from "@/constants/hundredDaysOfCode";
import DayCard from "@/components/DayCard";
import DailyQuestionSection from "@/components/DailyQuestionSection";
import SearchUserStatsSection from "@/components/SearchUserStatsSection";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ChevronDown, Search } from "lucide-react";

export default function HundredDaysOfCodePage() {
  const allDays = getAllDays();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [selectedDifficulty, setSelectedDifficulty] = useState("all");
  const [expandedDays, setExpandedDays] = useState({});

  // Filter questions based on search and filters
  const filteredDays = useMemo(() => {
    let results = [...allDays];

    // Apply search
    if (searchQuery.trim()) {
      const searchResults = searchQuestions(searchQuery, allDays);
      const daysMap = {};
      
      searchResults.forEach(question => {
        if (!daysMap[question.day]) {
          daysMap[question.day] = [];
        }
        daysMap[question.day].push(question);
      });

      results = allDays.filter(day => daysMap[day.day]).map(day => ({
        ...day,
        questions: daysMap[day.day]
      }));
    }

    // Apply topic filter
    if (selectedFilter !== "all") {
      results = results.map(day => ({
        ...day,
        questions: day.questions.filter(q => 
          q.topic.toLowerCase().includes(selectedFilter.toLowerCase())
        )
      })).filter(day => day.questions.length > 0);
    }

    // Apply difficulty filter
    if (selectedDifficulty !== "all") {
      results = results.map(day => ({
        ...day,
        questions: day.questions.filter(q => 
          q.difficulty.toLowerCase() === selectedDifficulty.toLowerCase()
        )
      })).filter(day => day.questions.length > 0);
    }

    return results;
  }, [searchQuery, selectedFilter, selectedDifficulty, allDays]);

  const toggleDayExpanded = (dayNumber) => {
    setExpandedDays(prev => ({
      ...prev,
      [dayNumber]: !prev[dayNumber]
    }));
  };

  const getDifficultyColor = (difficulty) => {
    switch(difficulty.toLowerCase()) {
      case "easy":
        return "text-green-600";
      case "medium":
        return "text-yellow-600";
      case "hard":
        return "text-red-600";
      default:
        return "text-gray-600";
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-5xl font-bold text-slate-900 dark:text-white mb-2">
            100 Days of Code Challenge
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-300">
            Master DSA with 3-4 questions per day. Track your progress and compete on the leaderboard!
          </p>
        </div>

        {/* Daily Challenge Section */}
        <DailyQuestionSection />

        {/* Search User Stats Section */}
        <SearchUserStatsSection />

        {/* Search and Filters */}
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">
            Search & Filter
          </h2>
          
          <div className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
              <Input
                type="text"
                placeholder="Search questions by title, topic, or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Filter Buttons */}
            <div className="flex flex-wrap gap-3">
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant={selectedFilter === "all" ? "default" : "outline"}
                  onClick={() => setSelectedFilter("all")}
                  size="sm"
                >
                  All Topics
                </Button>
                <Button
                  variant={selectedFilter === "array" ? "default" : "outline"}
                  onClick={() => setSelectedFilter("array")}
                  size="sm"
                >
                  Array
                </Button>
                <Button
                  variant={selectedFilter === "string" ? "default" : "outline"}
                  onClick={() => setSelectedFilter("string")}
                  size="sm"
                >
                  String
                </Button>
                <Button
                  variant={selectedFilter === "hash" ? "default" : "outline"}
                  onClick={() => setSelectedFilter("hash")}
                  size="sm"
                >
                  Hash Map
                </Button>
                <Button
                  variant={selectedFilter === "sorting" ? "default" : "outline"}
                  onClick={() => setSelectedFilter("sorting")}
                  size="sm"
                >
                  Sorting
                </Button>
              </div>

              <div className="flex gap-2 flex-wrap">
                <Button
                  variant={selectedDifficulty === "all" ? "default" : "outline"}
                  onClick={() => setSelectedDifficulty("all")}
                  size="sm"
                >
                  All Levels
                </Button>
                <Button
                  variant={selectedDifficulty === "easy" ? "default" : "outline"}
                  onClick={() => setSelectedDifficulty("easy")}
                  size="sm"
                  className={selectedDifficulty === "easy" ? "bg-green-600 hover:bg-green-700" : ""}
                >
                  Easy
                </Button>
                <Button
                  variant={selectedDifficulty === "medium" ? "default" : "outline"}
                  onClick={() => setSelectedDifficulty("medium")}
                  size="sm"
                  className={selectedDifficulty === "medium" ? "bg-yellow-600 hover:bg-yellow-700" : ""}
                >
                  Medium
                </Button>
                <Button
                  variant={selectedDifficulty === "hard" ? "default" : "outline"}
                  onClick={() => setSelectedDifficulty("hard")}
                  size="sm"
                  className={selectedDifficulty === "hard" ? "bg-red-600 hover:bg-red-700" : ""}
                >
                  Hard
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Days Grid */}
        <div className="space-y-4">
          {filteredDays.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-slate-500 dark:text-slate-400 text-lg">
                No questions found matching your filters. Try adjusting your search!
              </p>
            </div>
          ) : (
            filteredDays.map((day) => (
              <DayCard
                key={day.day}
                day={day}
                isExpanded={expandedDays[day.day] || false}
                onToggleExpand={() => toggleDayExpanded(day.day)}
                getDifficultyColor={getDifficultyColor}
              />
            ))
          )}
        </div>

        {/* Stats Footer */}
        <div className="mt-12 bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6">
          <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">
            Progress Overview
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-300">Total Days</p>
              <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                {allDays.length}
              </p>
            </div>
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-300">Total Questions</p>
              <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                {allDays.reduce((sum, day) => sum + day.questions.length, 0)}
              </p>
            </div>
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-300">Avg per Day</p>
              <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                {(allDays.reduce((sum, day) => sum + day.questions.length, 0) / allDays.length).toFixed(1)}
              </p>
            </div>
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-300">Estimated Time</p>
              <p className="text-3xl font-bold text-orange-600 dark:text-orange-400">
                100 days
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
