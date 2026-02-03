// components/ActivityTimeline.jsx
const ActivityTimeline = ({ activities }) => {
  return (
    <div className="space-y-4">
      {activities.map((activity, index) => (
        <div key={index} className="flex items-start gap-4">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 rounded-full bg-dark-200 flex items-center justify-center">
              <span className="text-lg">{activity.icon}</span>
            </div>
          </div>
          <div className="flex-1">
            <div className="flex justify-between">
              <h4 className="font-semibold">{activity.title}</h4>
              <span className="text-sm text-light-100">{activity.time}</span>
            </div>
            <p className="text-sm text-light-100">{activity.description}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ActivityTimeline;