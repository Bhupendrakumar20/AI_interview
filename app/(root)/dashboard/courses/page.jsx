'use client';

export default function CoursesPage() {
  const inProgressCourses = [
    { id: 1, title: 'Python Mastery', instructor: 'Alex Kumar', progress: 65, icon: '🐍', duration: '12 weeks' },
    { id: 2, title: 'DSA Complete', instructor: 'Raj Singh', progress: 45, icon: '📊', duration: '15 weeks' },
    { id: 3, title: 'Web Dev Pro', instructor: 'Emma Wilson', progress: 78, icon: '🌐', duration: '10 weeks' },
  ];

  const completedCourses = [
    { id: 4, title: 'JavaScript Fundamentals', instructor: 'John Doe', icon: '⚡', date: 'Mar 2024' },
    { id: 5, title: 'React Advanced', instructor: 'Sarah Chen', icon: '⚛️', date: 'Feb 2024' },
    { id: 6, title: 'SQL Mastery', instructor: 'Mike Johnson', icon: '🗄️', date: 'Jan 2024' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <div className="border-b border-slate-700/50 bg-slate-800/30 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-8 py-6">
          <div className="text-sm text-slate-400 mb-2">My Space › <span className="text-slate-300">My Courses</span></div>
          <h1 className="text-3xl font-bold text-white mb-2">My Courses</h1>
          <p className="text-slate-400">Continue learning and master new skills</p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          <div className="bg-slate-800/40 border border-slate-700/50 rounded-lg p-4">
            <div className="text-2xl font-bold text-white">3</div>
            <div className="text-sm text-slate-400 mt-1">In Progress</div>
          </div>
          <div className="bg-slate-800/40 border border-slate-700/50 rounded-lg p-4">
            <div className="text-2xl font-bold text-white">6</div>
            <div className="text-sm text-slate-400 mt-1">Completed</div>
          </div>
          <div className="bg-slate-800/40 border border-slate-700/50 rounded-lg p-4">
            <div className="text-2xl font-bold text-white">23h</div>
            <div className="text-sm text-slate-400 mt-1">Learning Time</div>
          </div>
          <div className="bg-slate-800/40 border border-slate-700/50 rounded-lg p-4">
            <div className="text-2xl font-bold text-white">92%</div>
            <div className="text-sm text-slate-400 mt-1">Avg Score</div>
          </div>
        </div>

        {/* In Progress */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-white mb-4">▶ In Progress</h2>
          <div className="grid grid-cols-3 gap-4">
            {inProgressCourses.map((course) => (
              <div key={course.id} className="bg-slate-800/40 border border-slate-700/50 rounded-lg overflow-hidden hover:border-slate-600/80 transition group">
                <div className="h-24 bg-gradient-to-br from-slate-700/50 to-slate-800/50 flex items-center justify-center text-4xl">
                  {course.icon}
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-white text-sm lines-clamp-2">{course.title}</h3>
                  <p className="text-xs text-slate-400 mt-1">{course.instructor}</p>
                  <div className="mt-3 space-y-2">
                    <div className="w-full bg-slate-700/50 rounded-full h-2">
                      <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${course.progress}%` }}></div>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">{course.progress}% Complete</span>
                      <span className="text-slate-500">{course.duration}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Completed */}
        <div>
          <h2 className="text-lg font-semibold text-white mb-4">✅ Completed</h2>
          <div className="grid grid-cols-3 gap-4">
            {completedCourses.map((course) => (
              <div key={course.id} className="bg-slate-800/40 border border-slate-700/50 rounded-lg overflow-hidden hover:border-slate-600/80 transition group">
                <div className="h-24 bg-gradient-to-br from-green-600/20 to-emerald-600/20 flex items-center justify-center text-4xl relative">
                  {course.icon}
                  <div className="absolute top-2 right-2 w-6 h-6 bg-green-500/80 rounded-full flex items-center justify-center text-white text-xs">✓</div>
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-white text-sm">{course.title}</h3>
                  <p className="text-xs text-slate-400 mt-1">{course.instructor}</p>
                  <div className="text-xs text-green-400 mt-3 font-semibold">Completed {course.date}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
