// components/ActivityTimeline.jsx
const ActivityTimeline = ({ activities }) => {
  return (
    <div className="space-y-4">
      {activities.map((activity, index) => (
        <div key={index} className="flex items-start gap-4">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center">
              <span className="text-lg">{activity.icon}</span>
            </div>
          </div>
          <div className="flex-1">
            <div className="flex justify-between items-center">
              <h4 className="font-bold text-sm text-slate-900 dark:text-white">{activity.title}</h4>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">{activity.time}</span>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300 mt-0.5">{activity.description}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ActivityTimeline;
