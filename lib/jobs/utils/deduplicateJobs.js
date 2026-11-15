const norm = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

function dedupeKey(job) {
  const place = job.isRemote ? "remote" : norm(job.location).split(" ")[0];
  return `${norm(job.title)}|${norm(job.company)}|${place}`;
}

// Higher = richer record, so we keep the most useful copy.
function richness(job) {
  return (
    Math.min(job.description.length, 3000) +
    (job.stipend !== "Not disclosed" ? 500 : 0) +
    job.skills.length * 50 +
    (job.applyLink ? 200 : 0)
  );
}

export function deduplicateJobs(jobs) {
  const map = new Map();
  for (const job of jobs) {
    const key = dedupeKey(job);
    const existing = map.get(key);
    if (!existing) {
      map.set(key, job);
      continue;
    }
    const [winner, loser] = richness(job) > richness(existing) ? [job, existing] : [existing, job];
    // Fill gaps in the winner from the loser and remember every source that listed it
    winner.sources = [...new Set([...winner.sources, ...loser.sources])];
    if (!winner.postedDate && loser.postedDate) winner.postedDate = loser.postedDate;
    if (winner.stipend === "Not disclosed" && loser.stipend !== "Not disclosed") winner.stipend = loser.stipend;
    if (winner.skills.length === 0) winner.skills = loser.skills;
    map.set(key, winner);
  }
  return [...map.values()];
}
