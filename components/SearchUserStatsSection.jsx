// /components/SearchUserStatsSection.jsx
// Component to search and display other users' LeetCode statistics

"use client";

import { useEffect, useState } from "react";
import { Search, User, TrendingUp, Award, Zap, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function SearchUserStatsSection() {
  const [searchUsername, setSearchUsername] = useState("");
  const [userStats, setUserStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searched, setSearched] = useState(false);

  const fetchUserStats = async (e) => {
    e.preventDefault();

    if (!searchUsername.trim()) {
      setError("Please enter a LeetCode username");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setUserStats(null);

      const response = await fetch(
        `https://leetcode-api-faisalshohag.vercel.app/${searchUsername.trim()}`
      );

      if (!response.ok) {
        throw new Error("User not found or API error");
      }

      const data = await response.json();

      // Check if data has required fields (totalSolved indicates valid user data)
      if (data && data.totalSolved !== undefined) {
        // Add the searched username to the data object for display
        setUserStats({
          ...data,
          username: searchUsername.trim(),
        });
        setSearched(true);
      } else {
        setError("User not found. Please check the username and try again.");
      }
    } catch (err) {
      console.error("Error fetching user stats:", err);
      setError("Failed to fetch user data. Please try again.");
      setUserStats(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mb-8">
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          <User className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Search User Stats</h2>
        </div>
        <p className="text-slate-600 dark:text-slate-400 text-sm">
          Find and compare other users&apos; LeetCode statistics and progress
        </p>
      </div>

      {/* Search Form */}
      <div className="bg-white/85 dark:bg-[#0F172A]/85 backdrop-blur-md border border-indigo-200/70 dark:border-indigo-500/30 rounded-3xl p-6 mb-6 shadow-sm">
        <form onSubmit={fetchUserStats} className="space-y-4">
          <div className="flex gap-2 flex-col sm:flex-row">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
              <Input
                type="text"
                placeholder="Enter LeetCode username..."
                value={searchUsername}
                onChange={(e) => setSearchUsername(e.target.value)}
                className="pl-12 bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-indigo-500 focus:ring-indigo-500/20 rounded-xl"
                disabled={loading}
              />
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-bold px-8 rounded-xl shadow-md shadow-indigo-500/25 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 cursor-pointer"
            >
              {loading ? "Searching..." : "Search"}
            </Button>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-xl">
              <AlertCircle className="w-4 h-4 text-red-500" />
              <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
            </div>
          )}
        </form>
      </div>

      {/* User Stats Card */}
      {loading && (
        <div className="bg-white/85 dark:bg-[#0F172A]/85 backdrop-blur-md border border-indigo-200/70 dark:border-indigo-500/30 rounded-3xl p-8 animate-pulse shadow-sm">
          <div className="flex items-center justify-center">
            <div className="text-center">
              <div className="h-6 w-48 bg-slate-200 dark:bg-slate-800 rounded-lg mx-auto mb-3"></div>
              <div className="h-4 w-64 bg-slate-200 dark:bg-slate-800 rounded-lg mx-auto"></div>
            </div>
          </div>
        </div>
      )}

      {userStats && !loading && (
        <div className="bg-white/85 dark:bg-[#0F172A]/85 backdrop-blur-md border border-indigo-200/70 dark:border-indigo-500/30 rounded-3xl p-8 hover:shadow-xl transition-all duration-300">
          {/* User Header */}
          <div className="flex items-center gap-4 mb-8 pb-8 border-b border-indigo-100/70 dark:border-indigo-900/40">
            <div className="w-20 h-20 rounded-2xl border-2 border-indigo-500 bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center flex-shrink-0 shadow-sm">
              <span className="text-3xl font-extrabold text-indigo-600 dark:text-indigo-400">
                {userStats.username?.charAt(0).toUpperCase() || "?"}
              </span>
            </div>
            <div className="flex-1">
              <h3 className="text-3xl font-bold text-slate-900 dark:text-white mb-1">
                {userStats.username}
              </h3>
              <p className="text-slate-500 dark:text-slate-400 text-sm">LeetCode Profile</p>
              <p className="text-indigo-600 dark:text-indigo-400 font-semibold text-sm mt-0.5">
                {userStats.totalSolved} problems solved
              </p>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {/* Total Solved */}
            <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl p-4 border border-slate-200 dark:border-slate-700/60">
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Problems Solved</p>
              <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                {userStats.totalSolved || 0}
              </p>
            </div>

            {/* Easy */}
            <div className="bg-emerald-50 dark:bg-emerald-950/30 rounded-xl p-4 border border-emerald-200 dark:border-emerald-800/50">
              <p className="text-xs text-emerald-700 dark:text-emerald-400 mb-1 font-semibold">Easy</p>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                {userStats.easySolved || 0}
              </p>
              {userStats.totalEasy && (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  / {userStats.totalEasy}
                </p>
              )}
            </div>

            {/* Medium */}
            <div className="bg-amber-50 dark:bg-amber-950/30 rounded-xl p-4 border border-amber-200 dark:border-amber-800/50">
              <p className="text-xs text-amber-700 dark:text-amber-400 mb-1 font-semibold">Medium</p>
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                {userStats.mediumSolved || 0}
              </p>
              {userStats.totalMedium && (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  / {userStats.totalMedium}
                </p>
              )}
            </div>

            {/* Hard */}
            <div className="bg-rose-50 dark:bg-rose-950/30 rounded-xl p-4 border border-rose-200 dark:border-rose-800/50">
              <p className="text-xs text-rose-700 dark:text-rose-400 mb-1 font-semibold">Hard</p>
              <p className="text-2xl font-bold text-rose-600 dark:text-rose-400">
                {userStats.hardSolved || 0}
              </p>
              {userStats.totalHard && (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  / {userStats.totalHard}
                </p>
              )}
            </div>
          </div>

          {/* Progress Bar */}
          {userStats.totalSolved && (
            <div className="mb-8">
              <div className="flex justify-between mb-2">
                <span className="text-slate-700 dark:text-slate-300 text-sm font-medium">Overall Progress</span>
                <span className="text-indigo-600 dark:text-indigo-400 font-bold">
                  {Math.round(
                    ((userStats.totalSolved || 0) / 3200) * 100
                  )}%
                </span>
              </div>
              <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-indigo-400 transition-all duration-500"
                  style={{
                    width: `${Math.min(
                      ((userStats.totalSolved || 0) / 3200) * 100,
                      100
                    )}%`,
                  }}
                ></div>
              </div>
            </div>
          )}

          {/* Additional Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-8 border-t border-indigo-100/70 dark:border-indigo-900/40">
            {userStats.reputation !== undefined && (
              <div className="text-center">
                <Award className="w-5 h-5 text-indigo-600 dark:text-indigo-400 mx-auto mb-2" />
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Reputation</p>
                <p className="text-lg font-bold text-slate-900 dark:text-white">
                  {(userStats.reputation || 0).toLocaleString()}
                </p>
              </div>
            )}

            {userStats.ranking && (
              <div className="text-center">
                <TrendingUp className="w-5 h-5 text-amber-500 mx-auto mb-2" />
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">World Rank</p>
                <p className="text-lg font-bold text-slate-900 dark:text-white">
                  {userStats.ranking.toLocaleString()}
                </p>
              </div>
            )}

            {userStats.badgeCount !== undefined && (
              <div className="text-center">
                <Zap className="w-5 h-5 text-indigo-600 dark:text-indigo-400 mx-auto mb-2" />
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Badges</p>
                <p className="text-lg font-bold text-slate-900 dark:text-white">
                  {userStats.badgeCount}
                </p>
              </div>
            )}

            {userStats.contributionPoint !== undefined && (
              <div className="text-center">
                <Zap className="w-5 h-5 text-indigo-600 dark:text-indigo-400 mx-auto mb-2" />
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Contribution</p>
                <p className="text-lg font-bold text-slate-900 dark:text-white">
                  {userStats.contributionPoint}
                </p>
              </div>
            )}
          </div>

          {/* Profile Link */}
          <div className="mt-8 pt-8 border-t border-indigo-100/70 dark:border-indigo-900/40">
            <a
              href={`https://leetcode.com/${userStats.username}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-bold py-2.5 px-6 rounded-xl shadow-md shadow-indigo-500/25 transition-all duration-300 hover:scale-105 active:scale-95"
            >
              View Full Profile on LeetCode →
            </a>
          </div>
        </div>
      )}

      {!userStats && searched && !loading && !error && (
        <div className="text-center py-12 text-slate-500 dark:text-slate-400">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg font-medium">No user data found</p>
        </div>
      )}

      {!searched && !userStats && (
        <div className="text-center py-12 bg-white/70 dark:bg-[#0F172A]/70 backdrop-blur-md border border-indigo-200/70 dark:border-indigo-500/30 rounded-3xl">
          <Search className="w-12 h-12 mx-auto mb-4 text-slate-400 opacity-60" />
          <p className="text-slate-600 dark:text-slate-300 font-medium">
            Enter a LeetCode username above to view user statistics
          </p>
        </div>
      )}
    </div>
  );
}
