"use client";

import { CalendarDays, ExternalLink, MapPin, Users } from "lucide-react";

export default function CompetitionCard({ competition }) {
  const statusClass = competition.status === "closed"
    ? "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
    : competition.status === "closing"
    ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200"
    : "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200";

  return (
    <article className="premium-card-glass flex min-h-full flex-col justify-between p-6 transition-all duration-300 sm:p-7">
      <div>
        <div className="mb-3.5 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-xl font-bold leading-snug text-slate-900 dark:text-white">{competition.title}</h3>
            <p className="mt-0.5 text-sm font-semibold text-indigo-600 dark:text-[#C7D2FE]">
              {competition.organizer || competition.source}
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold capitalize text-primary">
            {competition.source}
          </span>
        </div>

        <div className="mb-4">
          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${statusClass}`}>
            {competition.status === "closing" ? "Closing soon" : competition.status || "Open"}
          </span>
        </div>

        <p className="mb-5 line-clamp-3 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
          {competition.description || "No description provided by the source."}
        </p>

        <div className="premium-inset-tile mb-4 p-4">
          <div className="text-center">
            <div className="mb-1 text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Prize Pool</div>
            <div className="text-xl font-black text-slate-900 dark:text-white">{competition.prize || "Not listed"}</div>
          </div>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-3 text-xs">
          <div className="flex min-w-0 items-start gap-2">
            <CalendarDays size={15} className="mt-0.5 shrink-0 text-primary" />
            <div>
              <p className="font-bold text-slate-900 dark:text-white">{competition.deadline || "No deadline listed"}</p>
              <p className="text-slate-500 dark:text-slate-400">Deadline</p>
            </div>
          </div>
          <div className="flex min-w-0 items-start gap-2">
            <Users size={15} className="mt-0.5 shrink-0 text-primary" />
            <div>
              <p className="font-bold text-slate-900 dark:text-white">{competition.participants || "Not listed"}</p>
              <p className="text-slate-500 dark:text-slate-400">Participants</p>
            </div>
          </div>
        </div>

        {competition.location && (
          <p className="mb-4 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <MapPin size={14} className="shrink-0 text-primary" />
            {competition.location}
            {competition.format ? ` - ${competition.format}` : ""}
          </p>
        )}

        {competition.tags?.length > 0 && (
          <div className="mb-5 flex flex-wrap gap-1.5">
            {competition.tags.slice(0, 5).map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-indigo-100 bg-indigo-50/80 px-2.5 py-1 text-xs font-medium text-indigo-700 dark:border-slate-700/60 dark:bg-slate-800/80 dark:text-indigo-200"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {competition.url ? (
        <a
          href={competition.url}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-theme-action flex w-full items-center justify-center py-2.5 text-xs font-bold shadow-md sm:text-sm"
        >
          View opportunity <ExternalLink size={14} className="ml-2" />
        </a>
      ) : (
        <span className="flex w-full items-center justify-center rounded-md bg-muted px-4 py-2.5 text-xs font-bold text-muted-foreground sm:text-sm">
          No external link available
        </span>
      )}
    </article>
  );
}
