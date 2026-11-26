"use client";

import { useCallback, useEffect, useState } from "react";
import { Search, RefreshCw, Trophy } from "lucide-react";
import CompetitionCard from "@/components/CompetitionCard";
import { Button } from "@/components/ui/button";

const SOURCES = [
  { value: "", label: "All platforms" },
  { value: "unstop", label: "Unstop" },
  { value: "kaggle", label: "Kaggle" },
];

const STATUSES = [
  { value: "", label: "Any status" },
  { value: "open", label: "Open" },
  { value: "closing", label: "Closing soon" },
  { value: "closed", label: "Closed" },
];

async function readJsonResponse(response) {
  const body = await response.text();
  try {
    return body ? JSON.parse(body) : {};
  } catch {
    const message = body.trim().slice(0, 300);
    throw new Error(message || `Server returned an invalid response (${response.status}).`);
  }
}

function formatDeadline(value) {
  if (!value) return "No deadline listed";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No deadline listed";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(date);
}

function formatParticipants(value) {
  if (typeof value !== "number") return "Not listed";
  return new Intl.NumberFormat().format(value);
}

export default function CompetitionsPage() {
  const [competitions, setCompetitions] = useState([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [source, setSource] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [providerResults, setProviderResults] = useState([]);

  const loadCompetitions = useCallback(async (signal) => {
    const params = new URLSearchParams({ limit: "100" });
    if (search.trim()) params.set("search", search.trim());
    if (source) params.set("source", source);
    if (status) params.set("status", status);

    const response = await fetch(`/api/competitions?${params}`, {
      cache: "no-store",
      signal,
    });
    const data = await readJsonResponse(response);
    if (!response.ok) throw new Error(data.error || data.detail || `Could not load competitions (${response.status}).`);
    setCompetitions(data.items || []);
    setTotal(data.total || 0);
    setError("");
  }, [search, source, status]);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setLoading(true);
      loadCompetitions(controller.signal)
        .catch((loadError) => {
          if (loadError.name !== "AbortError") {
            setError(loadError.message || "Could not load competitions.");
          }
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, search ? 250 : 0);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [loadCompetitions, search]);

  const syncCompetitions = async () => {
    setRefreshing(true);
    setError("");
    try {
      const response = await fetch("/api/competitions/sync", { method: "POST" });
      const result = await readJsonResponse(response);
      if (!response.ok) throw new Error(result.error || result.detail || `Could not refresh competition sources (${response.status}).`);
      setProviderResults(result.providers || []);
      await loadCompetitions();
    } catch (syncError) {
      setError(syncError.message || "Could not refresh competition sources.");
    } finally {
      setRefreshing(false);
    }
  };

  const loadMore = async () => {
    setLoadingMore(true);
    setError("");
    try {
      const params = new URLSearchParams({
        limit: "100",
        offset: String(competitions.length),
      });
      if (search.trim()) params.set("search", search.trim());
      if (source) params.set("source", source);
      if (status) params.set("status", status);

      const response = await fetch(`/api/competitions?${params}`, { cache: "no-store" });
      const data = await readJsonResponse(response);
      if (!response.ok) throw new Error(data.error || data.detail || `Could not load more competitions (${response.status}).`);
      setCompetitions((current) => [...current, ...(data.items || [])]);
    } catch (loadError) {
      setError(loadError.message || "Could not load more competitions.");
    } finally {
      setLoadingMore(false);
    }
  };

  const hasProviderIssues = providerResults.some((provider) =>
    provider.status === "error" || provider.status === "not_configured"
  );

  return (
    <div className="space-y-8 pb-12">
      <header className="relative overflow-hidden rounded-3xl border border-indigo-200/70 bg-gradient-to-br from-indigo-50 via-white to-cyan-50 p-6 shadow-sm dark:border-indigo-900/50 dark:from-indigo-950/60 dark:via-slate-950 dark:to-cyan-950/40 sm:p-9">
        <div className="relative z-10 max-w-3xl">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-white/80 px-3 py-1 text-xs font-semibold text-indigo-700 dark:border-indigo-800 dark:bg-slate-900/70 dark:text-indigo-200">
            <Trophy size={14} />
            Unstop | Kaggle
          </div>
          <h1 className="text-3xl font-black tracking-tight text-slate-950 dark:text-white sm:text-4xl">
            Find your next competition
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300 sm:text-base">
            Discover hackathons, challenges, and competitions in one place. Filter opportunities and follow the source link to participate.
          </p>
        </div>
        <Trophy
          aria-hidden="true"
          className="absolute -bottom-8 -right-4 h-44 w-44 rotate-12 text-indigo-200/60 dark:text-indigo-900/50"
        />
      </header>

      <section className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5" aria-label="Competition filters">
        <div className="grid gap-3 lg:grid-cols-[minmax(16rem,1fr)_12rem_12rem_auto]">
          <label className="relative block">
            <span className="sr-only">Search competitions</span>
            <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search title, organizer, or topic"
              className="h-11 w-full rounded-xl border border-input bg-background pl-10 pr-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
            />
          </label>
          <label>
            <span className="sr-only">Filter by platform</span>
            <select
              value={source}
              onChange={(event) => setSource(event.target.value)}
              className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
            >
              {SOURCES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </label>
          <label>
            <span className="sr-only">Filter by status</span>
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
            >
              {STATUSES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </label>
          <Button
            type="button"
            onClick={syncCompetitions}
            disabled={refreshing}
            className="h-11 gap-2 rounded-xl px-5"
          >
            <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
            {refreshing ? "Refreshing sources..." : "Refresh listings"}
          </Button>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>{loading ? "Loading opportunities..." : `${total} ${total === 1 ? "opportunity" : "opportunities"} found`}</span>
          <span>Listings are aggregated from connected provider APIs.</span>
        </div>
      </section>

      {providerResults.length > 0 && (
        <section
          className={`rounded-xl border p-4 ${hasProviderIssues ? "border-amber-300 bg-amber-50/70 dark:border-amber-900 dark:bg-amber-950/20" : "border-emerald-300 bg-emerald-50/70 dark:border-emerald-900 dark:bg-emerald-950/20"}`}
          aria-live="polite"
        >
          <h2 className="text-sm font-bold text-foreground">Source refresh report</h2>
          <ul className="mt-2 grid gap-2 text-xs text-muted-foreground sm:grid-cols-3">
            {providerResults.map((provider) => (
              <li key={provider.source} className="flex items-start justify-between gap-2">
                <span className="font-semibold capitalize text-foreground">{provider.source}</span>
                <span className="text-right">
                  {provider.status === "ok"
                    ? `${provider.count} updated`
                    : provider.status === "not_configured"
                    ? "API endpoint not configured"
                    : provider.error || "Refresh failed"}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {error && (
        <div role="alert" className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3" aria-label="Loading competitions">
          {[0, 1, 2].map((item) => (
            <div key={item} className="h-72 animate-pulse rounded-2xl border border-border bg-card" />
          ))}
        </div>
      ) : competitions.length > 0 ? (
        <section>
          <h2 className="mb-4 text-xl font-bold text-foreground">Discover opportunities</h2>
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {competitions.map((competition) => (
              <CompetitionCard
                key={`${competition.source}:${competition.source_id}`}
                competition={{
                  ...competition,
                  organizer: competition.organizer || competition.source,
                  prize: competition.prize || "Not listed",
                  deadline: formatDeadline(competition.deadline),
                  participants: formatParticipants(competition.participants),
                  tags: competition.tags || [],
                }}
              />
            ))}
          </div>
          {competitions.length < total && (
            <div className="mt-7 flex justify-center">
              <Button type="button" onClick={loadMore} disabled={loadingMore} variant="outline">
                {loadingMore ? "Loading..." : "Load more opportunities"}
              </Button>
            </div>
          )}
        </section>
      ) : !error ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/60 px-6 py-14 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Trophy size={22} />
          </div>
          <h2 className="mt-4 text-lg font-bold text-foreground">
            {search || source || status ? "No matching competitions" : "No competitions cached yet"}
          </h2>
          <p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">
            {search || source || status
              ? "Try changing the search or filters."
              : "Refresh listings to fetch the latest opportunities from connected sources. Provider endpoints must be configured on the backend."}
          </p>
          {!search && !source && !status && (
            <Button type="button" onClick={syncCompetitions} disabled={refreshing} className="mt-5 gap-2">
              <RefreshCw size={15} className={refreshing ? "animate-spin" : ""} />
              {refreshing ? "Connecting to sources..." : "Fetch latest competitions"}
            </Button>
          )}
        </div>
      ) : null}
    </div>
  );
}
