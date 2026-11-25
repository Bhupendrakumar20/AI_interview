// components/CheckProfileModal.jsx
"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Flame, Loader2, Search, UserCheck, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import ProfileIdentityCard from "@/components/ProfileIdentityCard";
import {
  getCandidateProfileCardAction,
  searchCandidateProfilesAction,
} from "@/lib/actions/profile.action";

export default function CheckProfileModal({ open, onClose }) {
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [loadingCard, setLoadingCard] = useState(false);
  const [error, setError] = useState("");
  const [results, setResults] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState(null);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const handleOpenCandidate = async (candidateId) => {
    setLoadingCard(true);
    setError("");
    const res = await getCandidateProfileCardAction(candidateId);
    setLoadingCard(false);
    if (!res?.success || !res.profile) {
      setError(res?.error || "Could not load this user's profile card.");
      return;
    }
    setSelectedProfile(res.profile);
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    const cleaned = query.trim().replace(/^@+/, "");
    if (cleaned.length < 2) {
      setError("Enter at least 2 characters (name, @handle, exact email, or user ID).");
      setResults([]);
      setSelectedProfile(null);
      setHasSearched(false);
      return;
    }

    setSearching(true);
    setError("");
    setSelectedProfile(null);
    const res = await searchCandidateProfilesAction(query);
    setSearching(false);
    setHasSearched(true);

    if (!res?.success) {
      setError(res?.error || "Search failed. Please try again.");
      setResults([]);
      return;
    }

    const found = res.results || [];
    setResults(found);

    if (found.length === 0) {
      setError("No matching user found. Check the spelling and try again.");
      return;
    }

    if (found.length === 1) {
      await handleOpenCandidate(found[0].id);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 overflow-y-auto"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Search and view candidate profiles"
    >
      <div
        className="premium-card-glass w-full max-w-[500px] p-5 sm:p-6 space-y-4 my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/15 border border-indigo-400/30 flex items-center justify-center shrink-0">
              <UserCheck className="h-4 w-4 text-indigo-500 dark:text-indigo-300" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-tight">
                Check User Profile
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                Search by name, @handle, exact email, or user ID
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-1.5 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800/70 transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Search Input */}
        <form onSubmit={handleSearch} className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. Bhupendra, @handle, or user ID..."
              className="pl-9 input"
              autoFocus
            />
          </div>
          <Button
            type="submit"
            disabled={searching || loadingCard}
            className="btn-theme-action px-4 py-2 text-xs sm:text-sm font-bold shrink-0"
          >
            {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
          </Button>
        </form>

        {error && (
          <p className="text-xs font-medium text-rose-600 dark:text-rose-400 bg-rose-500/10 border border-rose-500/25 rounded-xl px-3 py-2">
            {error}
          </p>
        )}

        {/* Loading Card State */}
        {loadingCard && (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-500 dark:text-slate-400">
            <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />
            <span>Loading profile card...</span>
          </div>
        )}

        {/* Selected User Profile Card */}
        {!loadingCard && selectedProfile && (
          <div className="space-y-3">
            {results.length > 1 && (
              <button
                type="button"
                onClick={() => setSelectedProfile(null)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-300 hover:underline cursor-pointer"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to {results.length} matching profiles
              </button>
            )}
            <ProfileIdentityCard
              user={selectedProfile.user}
              summary={selectedProfile.summary}
              achievements={selectedProfile.achievements}
              readOnly
            />
          </div>
        )}

        {/* Matching Search Results List */}
        {!loadingCard && !selectedProfile && hasSearched && results.length > 0 && (
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Matching Candidates ({results.length})
            </p>
            {results.map((candidate) => (
              <button
                key={candidate.id}
                type="button"
                onClick={() => handleOpenCandidate(candidate.id)}
                className="w-full premium-inset-tile p-3 flex items-center justify-between gap-3 text-left hover:border-indigo-400/60 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-linear-to-br from-indigo-500 to-purple-600 text-white text-xs font-bold flex items-center justify-center overflow-hidden shrink-0">
                    {candidate.photoURL ? (
                      <img
                        src={candidate.photoURL}
                        alt={candidate.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      candidate.name.slice(0, 2).toUpperCase()
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                      {candidate.name}
                    </p>
                    <p className="text-xs text-indigo-600 dark:text-indigo-300 truncate">
                      {candidate.handle}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-700 dark:text-amber-300">
                    <Flame className="h-3 w-3 text-amber-500" />
                    {candidate.currentStreak}d
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
