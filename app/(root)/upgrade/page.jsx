const FUTURE_FEATURES = [
  "Live 1:1 coaching sessions with human mentors.",
  "Advanced analytics with trend lines over time.",
  "Team / recruiter accounts to review candidate performance.",
  "Integration with ATS platforms for real application pipelines.",
  "Custom interview templates per company / role.",
  "Deep resume parsing to auto-generate tailored questions.",
  "Gamification: streaks, badges, and skill levels.",
  "Multi-language interview support.",
  "Peer mock interviews and feedback exchange.",
  "Mobile app experience with offline practice modes.",
];

export default function UpgradePage() {
  return (
    <div className="flex flex-col gap-8">
      <section className="blue-gradient-dark rounded-3xl px-8 py-8 md:px-10 md:py-10">
        <h1 className="text-3xl md:text-4xl font-semibold mb-3">
          Upgrade · The Future of PrepWise
        </h1>
        <p className="text-light-100 max-w-2xl text-sm md:text-base">
          This roadmap showcases how PrepWise can evolve into a complete career
          growth companion—with live coaching, advanced analytics, and tools
          for both candidates and teams.
        </p>
      </section>

      <section className="card-border">
        <div className="card p-6 flex flex-col gap-4">
          <h2>Planned &amp; Potential Features</h2>
          <ul className="space-y-2">
            {FUTURE_FEATURES.map((item, index) => (
              <li key={index} className="text-sm text-light-100">
                <span className="font-semibold mr-2">{index + 1}.</span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
}
