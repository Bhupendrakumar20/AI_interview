// components/StatsCard.jsx
const StatsCard = ({ title, value, change, icon }) => {
  return (
    <div className="premium-card-glass p-5 flex flex-col justify-between transition-all duration-300">
      <div className="flex items-center justify-between mb-3">
        <div className="text-2xl">{icon}</div>
        {change && (
          <span className="text-xs px-2.5 py-0.5 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 rounded-full font-bold">
            {change}
          </span>
        )}
      </div>
      <div>
        <div className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{value}</div>
        <div className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 font-medium mt-1">{title}</div>
      </div>
    </div>
  );
};

export default StatsCard;