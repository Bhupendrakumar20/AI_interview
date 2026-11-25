// components/ProfileIdentityCard.jsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Award,
  BadgeCheck,
  BarChart3,
  BriefcaseBusiness,
  CheckCircle2,
  Code2,
  Copy,
  Flame,
  Globe,
  GraduationCap,
  Mail,
  Pencil,
  Play,
  Share2,
  Sparkles,
  Target,
  Trophy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

function getInitials(name, email) {
  const source = String(name || email || "PW").trim();
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}

function getHandle(user) {
  if (user?.handle) return user.handle;
  if (user?.username) return `@${String(user.username).replace(/^@+/, "")}`;
  if (user?.email && user.email !== "guest@example.com") {
    return `@${user.email.split("@")[0]}`;
  }
  return "@prepwise_member";
}

function normalizeExternalUrl(rawUrl) {
  const trimmed = String(rawUrl || "").trim();
  if (!trimmed) return null;
  const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const parsed = new URL(candidate);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return parsed.toString();
    }
    return null;
  } catch {
    return null;
  }
}

function GitHubGlyph({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2Z" />
    </svg>
  );
}

function LinkedInGlyph({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77Z" />
    </svg>
  );
}

function buildShowcaseBadges({ rewards = [], completedRounds = 0, averageScore = null, completedDays = 0 }) {
  const rewardMap = new Map(rewards.map((r) => [r.id, r]));
  const coding10 = rewardMap.get("coding-10");
  const jobs10 = rewardMap.get("jobs-10");
  const internships10 = rewardMap.get("internships-10");

  return [
    {
      id: "coding-10",
      title: "10-Day Coder",
      subtitle: coding10?.unlocked ? "Earned" : `${completedDays}/10 Days`,
      unlocked: Boolean(coding10?.unlocked),
      icon: Code2,
      ringClass: "border-indigo-400/50 bg-indigo-500/15 text-indigo-500 dark:text-indigo-300",
    },
    {
      id: "interview-ready",
      title: "Interview Ready",
      subtitle: completedRounds >= 1 ? `${completedRounds} Round${completedRounds === 1 ? "" : "s"}` : "0/1 Round",
      unlocked: completedRounds >= 1,
      icon: CheckCircle2,
      ringClass: "border-emerald-400/50 bg-emerald-500/15 text-emerald-600 dark:text-emerald-300",
    },
    {
      id: "top-scorer",
      title: "Top Scorer",
      subtitle: averageScore !== null && averageScore >= 75 ? `${averageScore}% Avg` : "75%+ Avg",
      unlocked: averageScore !== null && averageScore >= 75,
      icon: Sparkles,
      ringClass: "border-amber-400/50 bg-amber-500/15 text-amber-600 dark:text-amber-300",
    },
    {
      id: "career-seeker",
      title: internships10?.unlocked ? "Internship Pro" : jobs10?.unlocked ? "Career Starter" : "Career Seeker",
      subtitle: internships10?.unlocked || jobs10?.unlocked
        ? "Earned"
        : `${Math.max(jobs10?.progress || 0, internships10?.progress || 0)}/10 Applied`,
      unlocked: Boolean(internships10?.unlocked || jobs10?.unlocked),
      icon: internships10?.unlocked ? GraduationCap : BriefcaseBusiness,
      ringClass: "border-sky-400/50 bg-sky-500/15 text-sky-600 dark:text-sky-300",
    },
  ];
}

export default function ProfileIdentityCard({ user, summary, achievements, readOnly = false }) {
  const [imgError, setImgError] = useState(false);
  const isAuthenticated = Boolean(user) && user.uid !== "dummy-user-id";
  const displayName = user?.name || "PrepWise Candidate";
  const handle = getHandle(user);
  const initials = getInitials(user?.name, user?.email);
  const email = user?.email && user.email !== "guest@example.com" ? user.email : null;
  const avatarSrc = user?.photoURL || user?.image || "";

  useEffect(() => {
    setImgError(false);
  }, [avatarSrc]);

  const currentStreak = Number(user?.current_streak || 0);
  const bestStreak = Number(user?.best_streak || 0);
  const completedDays = achievements?.success ? Number(achievements.completedDays || 0) : 0;
  const completedRounds = Number(summary?.completedRounds || 0);
  const averageScore = summary?.averageScore ?? null;
  const latestScore = summary?.latestScore ?? null;
  const latestRole = summary?.latestRole || "";
  const strongestCategory = summary?.strongestCategory || "Not enough data";
  const rewards = achievements?.success ? achievements.rewards || [] : [];

  const showcaseBadges = buildShowcaseBadges({
    rewards,
    completedRounds,
    averageScore,
    completedDays,
  });

  const unlockedRewards = rewards.filter((r) => r.unlocked);
  const nextReward = rewards.find((r) => !r.unlocked);
  const highlightTitle = unlockedRewards.length > 0
    ? unlockedRewards[unlockedRewards.length - 1].title
    : nextReward
    ? `Next: ${nextReward.title}`
    : "PrepWise Milestone Tracker";
  const highlightSubtitle = unlockedRewards.length > 0
    ? `${unlockedRewards.length} milestone${unlockedRewards.length === 1 ? "" : "s"} unlocked`
    : nextReward
    ? `${nextReward.progress}/${nextReward.target} toward milestone`
    : "Track interviews & 100 Days progress";

  const memberSince = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString("en-US", { month: "short", year: "numeric" })
    : null;

  const skillTags = String(user?.skills || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const handleEditScroll = (focusId) => {
    if (focusId) {
      const field = document.getElementById(focusId);
      if (field) {
        field.scrollIntoView({ behavior: "smooth", block: "center" });
        field.focus({ preventScroll: true });
        return;
      }
    }
    const target = document.getElementById("profile-edit-form");
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
      const firstInput = target.querySelector("input:not([type='file'])");
      if (firstInput) firstInput.focus({ preventScroll: true });
    }
  };

  const socialLinks = [
    {
      id: "github",
      label: "GitHub",
      url: normalizeExternalUrl(user?.github),
      Icon: GitHubGlyph,
      activeClass: "hover:border-slate-500 hover:text-slate-900 dark:hover:text-white",
    },
    {
      id: "linkedin",
      label: "LinkedIn",
      url: normalizeExternalUrl(user?.linkedin),
      Icon: LinkedInGlyph,
      activeClass: "hover:border-sky-500/60 hover:text-sky-600 dark:hover:text-sky-400",
    },
    {
      id: "portfolio",
      label: "Portfolio",
      url: normalizeExternalUrl(user?.portfolio),
      Icon: Globe,
      activeClass: "hover:border-indigo-500/60 hover:text-indigo-600 dark:hover:text-indigo-300",
    },
  ];

  const handleCopyHandle = async () => {
    try {
      await navigator.clipboard.writeText(handle);
      toast.success(`Copied ${handle}`);
    } catch {
      toast.error("Unable to copy handle");
    }
  };

  const handleShareProfile = async () => {
    const unlockedNames = showcaseBadges.filter((b) => b.unlocked).map((b) => b.title);
    const badgeLine = unlockedNames.length > 0 ? `Badges: ${unlockedNames.join(", ")}` : "Active on PrepWise";
    const shareText = `${displayName} (${handle}) · ${currentStreak}d Streak · ${completedRounds} Interviews · ${completedDays}/100 Coding Days · ${badgeLine}`;
    const shareUrl = typeof window !== "undefined" ? `${window.location.origin}/profile` : "";

    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        try {
          await navigator.share({
            title: `${displayName} · PrepWise Profile`,
            text: shareText,
            url: shareUrl,
          });
          toast.success("Profile shared!");
          return;
        } catch (err) {
          if (err?.name === "AbortError") return;
        }
      }

      if (typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(`${shareText}${shareUrl ? `\n${shareUrl}` : ""}`);
        toast.success("Profile summary copied to clipboard!");
        return;
      }

      toast.info(shareText);
    } catch {
      toast.error("Failed to share profile");
    }
  };

  return (
    <section className="premium-card-glass w-full max-w-[440px] mx-auto xl:mx-0 p-4 sm:p-5 flex flex-col gap-3 overflow-hidden">
      {/* Top Status Bar */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Candidate Card
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          {isAuthenticated ? "Active" : "Guest"}
        </span>
      </div>

      {/* Compact Identity Header */}
      <div className="flex items-center gap-3.5">
        <div className="relative shrink-0">
          <div className="w-16 h-16 rounded-full p-[2px] bg-linear-to-br from-indigo-400 via-blue-500 to-purple-500 shadow-md shadow-indigo-500/25">
            <div className="w-full h-full rounded-full bg-slate-100 dark:bg-slate-900 flex items-center justify-center overflow-hidden">
              {avatarSrc && !imgError ? (
                <img
                  src={avatarSrc}
                  alt={displayName}
                  onError={() => setImgError(true)}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-lg font-extrabold bg-linear-to-br from-indigo-600 to-purple-600 dark:from-indigo-300 dark:to-purple-300 bg-clip-text text-transparent">
                  {initials}
                </span>
              )}
            </div>
          </div>
          <span
            className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-white dark:border-slate-900 bg-emerald-500"
            title="Active"
          />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white truncate">
              {displayName}
            </h2>
            {isAuthenticated && (
              <BadgeCheck className="h-4 w-4 text-blue-500 shrink-0" aria-label="Verified user" />
            )}
          </div>

          {email && (
            <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300 truncate">
              <Mail className="h-3 w-3 text-indigo-500 dark:text-indigo-400 shrink-0" />
              <span className="truncate">{email}</span>
            </p>
          )}

          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <span className="premium-pill-badge px-2 py-0.5 text-[11px] font-semibold">
              {handle}
            </span>
            {memberSince && (
              <span className="rounded-full border border-slate-200 dark:border-slate-700/80 bg-white/60 dark:bg-slate-800/70 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:text-slate-300">
                Joined {memberSince}
              </span>
            )}
            <div className="inline-flex items-center gap-1">
              {socialLinks.map(({ id, label, url, Icon, activeClass }) =>
                url ? (
                  <a
                    key={id}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={`Open ${label}`}
                    aria-label={`Open ${label}`}
                    className={cn(
                      "inline-flex items-center justify-center w-6 h-6 rounded-lg border border-slate-200 dark:border-slate-700/80 bg-white/75 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 transition-colors",
                      activeClass
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </a>
                ) : !readOnly ? (
                  <button
                    key={id}
                    type="button"
                    onClick={() => {
                      toast.info(`Add your ${label} link in the profile form.`);
                      handleEditScroll();
                    }}
                    title={`Add ${label} link`}
                    aria-label={`Add ${label} link`}
                    className="inline-flex items-center justify-center w-6 h-6 rounded-lg border border-dashed border-slate-300/80 dark:border-slate-700/70 bg-transparent text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors cursor-pointer"
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </button>
                ) : null
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Small Bio / Tagline */}
      {(user?.bio || !readOnly) && (
        <div className="text-center px-2">
          {user?.bio ? (
            <p className="text-[11px] italic text-slate-600 dark:text-slate-300 line-clamp-2 leading-snug">
              &ldquo;{user.bio}&rdquo;
            </p>
          ) : (
            <button
              type="button"
              onClick={() => handleEditScroll("profile-bio-input")}
              className="text-[11px] text-slate-500 dark:text-slate-400 hover:text-indigo-500 dark:hover:text-indigo-300 transition-colors cursor-pointer"
            >
              + Add a short bio in profile
            </button>
          )}
        </div>
      )}

      {/* Small Skills / Tech Stack (Max 5) */}
      {(skillTags.length > 0 || !readOnly) && (
        <div className="flex flex-wrap items-center justify-center gap-1.5">
          {skillTags.length > 0 ? (
            skillTags.slice(0, 5).map((skill, index) => (
              <span
                key={`${skill}-${index}`}
                className="px-2 py-0.5 bg-indigo-50/80 dark:bg-slate-800/80 text-indigo-700 dark:text-indigo-200 border border-indigo-200/70 dark:border-slate-700/70 text-[10px] rounded-full font-semibold"
              >
                {skill}
              </span>
            ))
          ) : (
            <button
              type="button"
              onClick={() => handleEditScroll("profile-skills-input")}
              className="px-2.5 py-0.5 rounded-full border border-dashed border-slate-300 dark:border-slate-700 text-[10px] font-medium text-slate-500 dark:text-slate-400 hover:text-indigo-500 dark:hover:text-indigo-300 transition-colors cursor-pointer"
            >
              + Add up to 5 tech skills
            </button>
          )}
        </div>
      )}

      {/* Compact 3x2 Metrics Grid (2 rows, 3 columns) */}
      <div className="grid grid-cols-3 gap-2">
        {/* 1. Day Streak */}
        <div className="rounded-xl border border-amber-500/35 bg-linear-to-br from-amber-500/12 via-indigo-500/8 to-purple-500/12 p-2.5 flex flex-col justify-between gap-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-6 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shrink-0">
              <Flame className="h-3.5 w-3.5 text-amber-500" />
            </div>
            <p className="text-sm sm:text-base font-black text-slate-900 dark:text-white leading-none">
              {currentStreak}d
            </p>
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold text-slate-700 dark:text-slate-200 leading-tight truncate">
              Day Streak
            </p>
            <p className="text-[9px] text-slate-500 dark:text-slate-400 leading-tight truncate">
              Best {bestStreak}d
            </p>
          </div>
        </div>

        {/* 2. Coding Milestone */}
        <div
          className="rounded-xl border border-amber-400/35 bg-linear-to-br from-amber-500/10 via-slate-900/5 to-amber-500/15 dark:from-amber-500/12 dark:via-slate-800/60 dark:to-amber-500/12 p-2.5 flex flex-col justify-between gap-1 min-w-0"
          title={highlightTitle}
        >
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-6 rounded-lg bg-amber-500/15 border border-amber-400/30 flex items-center justify-center shrink-0">
              <Trophy className="h-3.5 w-3.5 text-amber-500" />
            </div>
            <p className="text-sm sm:text-base font-black text-slate-900 dark:text-white leading-none truncate">
              {completedDays}/100
            </p>
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-semibold text-slate-700 dark:text-slate-200 leading-tight truncate">
              {highlightTitle}
            </p>
            <p className="text-[9px] text-slate-500 dark:text-slate-400 leading-tight truncate">
              Coding Days
            </p>
          </div>
        </div>

        {/* 3. Completed Rounds */}
        <div className="premium-inset-tile p-2.5 flex flex-col justify-between gap-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-6 rounded-lg bg-indigo-500/15 border border-indigo-400/30 flex items-center justify-center shrink-0">
              <Play className="h-3 w-3 text-indigo-600 dark:text-indigo-300" />
            </div>
            <p className="text-sm sm:text-base font-black text-slate-900 dark:text-white leading-none">
              {completedRounds}
            </p>
          </div>
          <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 leading-tight truncate">
            Interviews
          </p>
        </div>

        {/* 4. Average Score */}
        <div className="premium-inset-tile p-2.5 flex flex-col justify-between gap-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-6 rounded-lg bg-emerald-500/15 border border-emerald-400/30 flex items-center justify-center shrink-0">
              <Target className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-300" />
            </div>
            <p className="text-sm sm:text-base font-black text-slate-900 dark:text-white leading-none truncate">
              {averageScore === null ? "—" : `${averageScore}%`}
            </p>
          </div>
          <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 leading-tight truncate">
            Avg Score
          </p>
        </div>

        {/* 5. Latest Score */}
        <div className="premium-inset-tile p-2.5 flex flex-col justify-between gap-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-6 rounded-lg bg-sky-500/15 border border-sky-400/30 flex items-center justify-center shrink-0">
              <BarChart3 className="h-3.5 w-3.5 text-sky-600 dark:text-sky-300" />
            </div>
            <p className="text-sm sm:text-base font-black text-slate-900 dark:text-white leading-none truncate">
              {latestScore === null ? "—" : `${latestScore}/100`}
            </p>
          </div>
          <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 leading-tight truncate" title={latestRole}>
            {latestScore !== null && latestRole ? latestRole : "Latest Score"}
          </p>
        </div>

        {/* 6. Strongest Area */}
        <div className="premium-inset-tile p-2.5 flex flex-col justify-between gap-1 min-w-0">
          <div className="flex items-start gap-1.5">
            <div className="w-6 h-6 rounded-lg bg-teal-500/15 border border-teal-400/30 flex items-center justify-center shrink-0">
              <Award className="h-3.5 w-3.5 text-teal-600 dark:text-teal-300" />
            </div>
            <p className="text-[11px] font-bold text-slate-900 dark:text-white leading-tight line-clamp-2 break-words" title={strongestCategory}>
              {strongestCategory}
            </p>
          </div>
          <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 leading-tight truncate">
            Top Area
          </p>
        </div>
      </div>

      {/* Achievements & Badges Box */}
      <div className="premium-inset-tile p-3">
        <div className="flex items-center justify-between gap-2 mb-2.5">
          <div className="flex items-center gap-1.5">
            <Trophy className="h-3.5 w-3.5 text-amber-500" />
            <h3 className="text-xs font-bold text-slate-900 dark:text-white">
              Achievements &amp; Badges
            </h3>
          </div>
          <Link
            href="/analytics"
            className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-300 hover:underline"
          >
            View All →
          </Link>
        </div>

        <div className="grid grid-cols-4 gap-1.5">
          {showcaseBadges.map((badge) => {
            const Icon = badge.icon;
            return (
              <div
                key={badge.id}
                className={cn(
                  "rounded-xl border p-1.5 text-center flex flex-col items-center gap-1 transition-colors",
                  badge.unlocked
                    ? "border-indigo-200 dark:border-slate-700/80 bg-white/80 dark:bg-slate-900/60"
                    : "border-slate-200/70 dark:border-slate-800/80 bg-slate-100/50 dark:bg-slate-900/30 opacity-75"
                )}
              >
                <div
                  className={cn(
                    "w-8 h-8 rounded-lg border flex items-center justify-center",
                    badge.unlocked
                      ? badge.ringClass
                      : "border-slate-300/60 dark:border-slate-700 bg-slate-200/50 dark:bg-slate-800 text-slate-400"
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <p className="text-[10px] font-bold text-slate-800 dark:text-slate-200 leading-tight">
                  {badge.title}
                </p>
                <p className="text-[9px] font-medium text-slate-500 dark:text-slate-400 leading-none">
                  {badge.subtitle}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom Action Bar */}
      <div className="flex items-center gap-2 pt-0.5">
        {!readOnly && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleEditScroll()}
            className="rounded-xl border-slate-300 dark:border-slate-700 bg-white/70 dark:bg-slate-800/70 text-slate-700 dark:text-slate-200 px-3 gap-1.5 text-xs"
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </Button>
        )}

        <Button
          type="button"
          size="sm"
          onClick={handleShareProfile}
          className="btn-theme-action flex-1 py-2 text-xs font-bold shadow-md gap-1.5"
        >
          <Share2 className="h-3.5 w-3.5" />
          Share Profile
        </Button>

        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={handleCopyHandle}
          title={`Copy ${handle}`}
          aria-label="Copy profile handle"
          className="h-8 w-8 rounded-xl border-slate-300 dark:border-slate-700 bg-white/70 dark:bg-slate-800/70 text-slate-700 dark:text-slate-200 shrink-0"
        >
          <Copy className="h-3.5 w-3.5" />
        </Button>
      </div>
    </section>
  );
}
