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
          <User className="w-5 h-5 text-primary-200" />
          <h2 className="text-xl font-bold text-white">Search User Stats</h2>
        </div>
        <p className="text-light-400 text-sm">
          Find and compare other users' LeetCode statistics and progress
        </p>
      </div>

      {/* Search Form */}
      <div className="bg-gradient-to-br from-dark-200/50 to-dark-250/50 backdrop-blur-sm border border-white/10 rounded-2xl p-6 mb-6">
        <form onSubmit={fetchUserStats} className="space-y-4">
          <div className="flex gap-2 flex-col sm:flex-row">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-light-400" />
              <Input
                type="text"
                placeholder="Enter LeetCode username..."
                value={searchUsername}
                onChange={(e) => setSearchUsername(e.target.value)}
                className="pl-12 bg-dark-200 border-white/10 text-white placeholder:text-light-400 focus:border-primary-200 focus:ring-primary-200/20"
                disabled={loading}
              />
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="bg-gradient-to-r from-primary-200 to-primary-300 text-dark-100 hover:from-primary-100 hover:to-primary-200 font-bold px-8 hover:scale-105 active:scale-95 transition-all duration-300"
            >
              {loading ? "Searching..." : "Search"}
            </Button>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
              <AlertCircle className="w-4 h-4 text-red-400" />
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          )}
        </form>
      </div>

      {/* User Stats Card */}
      {loading && (
        <div className="bg-gradient-to-br from-dark-200/50 to-dark-250/50 backdrop-blur-sm border border-white/10 rounded-2xl p-8 animate-pulse">
          <div className="flex items-center justify-center">
            <div className="text-center">
              <div className="h-6 w-48 bg-dark-300 rounded-lg mx-auto mb-3"></div>
              <div className="h-4 w-64 bg-dark-300 rounded-lg mx-auto"></div>
            </div>
          </div>
        </div>
      )}

      {userStats && !loading && (
        <div className="bg-gradient-to-br from-dark-200/50 to-dark-250/50 backdrop-blur-sm border border-white/10 rounded-2xl p-8 hover:border-primary-200/30 transition-all duration-300">
          {/* User Header */}
          <div className="flex items-center gap-4 mb-8 pb-8 border-b border-white/10">
            <div className="w-24 h-24 rounded-full border-2 border-primary-200 bg-gradient-to-br from-primary-200/20 to-primary-300/20 flex items-center justify-center flex-shrink-0">
              <span className="text-3xl font-bold text-primary-200">
                {userStats.username?.charAt(0).toUpperCase() || "?"}
              </span>
            </div>
            <div className="flex-1">
              <h3 className="text-3xl font-bold text-white mb-2">
                {userStats.username}
              </h3>
              <p className="text-light-400 mb-2">LeetCode Profile</p>
              <p className="text-light-300 text-sm">
                {userStats.totalSolved} problems solved
              </p>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {/* Total Solved */}
            <div className="bg-dark-300/30 rounded-lg p-4 border border-white/5">
              <p className="text-xs text-light-400 mb-1">Problems Solved</p>
              <p className="text-2xl font-bold text-primary-200">
                {userStats.totalSolved || 0}
              </p>
            </div>

            {/* Easy */}
            <div className="bg-green-500/10 rounded-lg p-4 border border-green-500/20">
              <p className="text-xs text-green-400 mb-1">Easy</p>
              <p className="text-2xl font-bold text-green-400">
                {userStats.easySolved || 0}
              </p>
              {userStats.totalEasy && (
                <p className="text-xs text-light-400">
                  / {userStats.totalEasy}
                </p>
              )}
            </div>

            {/* Medium */}
            <div className="bg-yellow-500/10 rounded-lg p-4 border border-yellow-500/20">
              <p className="text-xs text-yellow-400 mb-1">Medium</p>
              <p className="text-2xl font-bold text-yellow-400">
                {userStats.mediumSolved || 0}
              </p>
              {userStats.totalMedium && (
                <p className="text-xs text-light-400">
                  / {userStats.totalMedium}
                </p>
              )}
            </div>

            {/* Hard */}
            <div className="bg-red-500/10 rounded-lg p-4 border border-red-500/20">
              <p className="text-xs text-red-400 mb-1">Hard</p>
              <p className="text-2xl font-bold text-red-400">
                {userStats.hardSolved || 0}
              </p>
              {userStats.totalHard && (
                <p className="text-xs text-light-400">
                  / {userStats.totalHard}
                </p>
              )}
            </div>
          </div>

          {/* Progress Bar */}
          {userStats.totalSolved && (
            <div className="mb-8">
              <div className="flex justify-between mb-2">
                <span className="text-light-300 text-sm">Overall Progress</span>
                <span className="text-primary-200 font-semibold">
                  {Math.round(
                    ((userStats.totalSolved || 0) / 3200) * 100
                  )}%
                </span>
              </div>
              <div className="h-2 bg-dark-300 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary-200 to-primary-400 transition-all duration-500"
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
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-8 border-t border-white/10">
            {userStats.reputation !== undefined && (
              <div className="text-center">
                <Award className="w-5 h-5 text-primary-200 mx-auto mb-2" />
                <p className="text-xs text-light-400 mb-1">Reputation</p>
                <p className="text-lg font-semibold text-white">
                  {(userStats.reputation || 0).toLocaleString()}
                </p>
              </div>
            )}

            {userStats.ranking && (
              <div className="text-center">
                <TrendingUp className="w-5 h-5 text-yellow-400 mx-auto mb-2" />
                <p className="text-xs text-light-400 mb-1">World Rank</p>
                <p className="text-lg font-semibold text-white">
                  {userStats.ranking.toLocaleString()}
                </p>
              </div>
            )}

            {userStats.badgeCount !== undefined && (
              <div className="text-center">
                <Zap className="w-5 h-5 text-primary-300 mx-auto mb-2" />
                <p className="text-xs text-light-400 mb-1">Badges</p>
                <p className="text-lg font-semibold text-white">
                  {userStats.badgeCount}
                </p>
              </div>
            )}

            {userStats.contributionPoint !== undefined && (
              <div className="text-center">
                <Zap className="w-5 h-5 text-primary-300 mx-auto mb-2" />
                <p className="text-xs text-light-400 mb-1">Contribution</p>
                <p className="text-lg font-semibold text-white">
                  {userStats.contributionPoint}
                </p>
              </div>
            )}
          </div>

          {/* Profile Link */}
          <div className="mt-8 pt-8 border-t border-white/10">
            <a
              href={`https://leetcode.com/${userStats.username}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block bg-gradient-to-r from-primary-200 to-primary-300 text-dark-100 hover:from-primary-100 hover:to-primary-200 font-bold py-2 px-6 rounded-full transition-all duration-300 hover:scale-105 active:scale-95"
            >
              View Full Profile on LeetCode →
            </a>
          </div>
        </div>
      )}

      {!userStats && searched && !loading && !error && (
        <div className="text-center py-12 text-light-400">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg">No user data found</p>
        </div>
      )}

      {!searched && !userStats && (
        <div className="text-center py-12 bg-gradient-to-br from-dark-200/50 to-dark-250/50 backdrop-blur-sm border border-white/10 rounded-2xl">
          <Search className="w-12 h-12 mx-auto mb-4 text-light-400 opacity-50" />
          <p className="text-light-300">
            Enter a LeetCode username above to view user statistics
          </p>
        </div>
      )}
    </div>
  );
}
