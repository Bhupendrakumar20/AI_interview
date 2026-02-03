// components/StatsCard.jsx
const StatsCard = ({ title, value, change, icon }) => {
  return (
    <div className="card-border">
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="text-2xl">{icon}</div>
          <span className="text-xs px-2 py-1 bg-success-100/20 text-success-100 rounded-full">
            {change}
          </span>
        </div>
        <div className="text-2xl font-bold">{value}</div>
        <div className="text-sm text-light-100">{title}</div>
      </div>
    </div>
  );
};

export default StatsCard;