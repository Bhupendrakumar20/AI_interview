'use client';

import { useState } from 'react';
import { Play, Award, BookOpen, BarChart3, Share2, Bookmark, Code, Globe, Zap, Database } from 'lucide-react';

export default function CoursesPage() {
  const [toast, setToast] = useState(null);
  const [hoveredCourse, setHoveredCourse] = useState(null);

  const inProgressCourses = [
    { id: 1, title: 'Python Mastery', instructor: 'Alex Kumar', progress: 65, icon: Code, duration: '12 weeks' },
    { id: 2, title: 'DSA Complete', instructor: 'Raj Singh', progress: 45, icon: BarChart3, duration: '15 weeks' },
    { id: 3, title: 'Web Dev Pro', instructor: 'Emma Wilson', progress: 78, icon: Globe, duration: '10 weeks' },
  ];

  const completedCourses = [
    { id: 4, title: 'JavaScript Fundamentals', instructor: 'John Doe', icon: Zap, date: 'Mar 2024' },
    { id: 5, title: 'React Advanced', instructor: 'Sarah Chen', icon: Zap, date: 'Feb 2024' },
    { id: 6, title: 'SQL Mastery', instructor: 'Mike Johnson', icon: Database, date: 'Jan 2024' },
  ];

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const styles = `
    @keyframes slideInUp {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes fadeInScale {
      from { opacity: 0; transform: scale(0.95); }
      to { opacity: 1; transform: scale(1); }
    }
    .course-card {
      transition: all 0.3s cubic-bezier(0.23, 1, 0.32, 1);
    }
    .course-card:hover {
      transform: translateY(-8px);
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
    }
    .progress-bar {
      background: linear-gradient(90deg, #3b82f6 var(--progress), rgba(71, 85, 105, 0.5) var(--progress));
      transition: all 0.4s ease;
    }
    .course-actions {
      opacity: 0;
      transform: translateY(10px);
      transition: all 0.3s ease;
    }
    .course-card:hover .course-actions {
      opacity: 1;
      transform: translateY(0);
    }
  `;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <style>{styles}</style>

      {toast && (
        <div className="fixed top-4 right-4 bg-blue-600 text-white px-6 py-3 rounded-lg shadow-lg animate-fadeInScale z-50">
          {toast}
        </div>
      )}

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
          {[
            { label: 'In Progress', value: '3', icon: '⏳' },
            { label: 'Completed', value: '6', icon: '✅' },
            { label: 'Learning Time', value: '23h', icon: '⌛' },
            { label: 'Avg Score', value: '92%', icon: '⭐' }
          ].map((stat, idx) => (
            <div key={idx} className="bg-gradient-to-br from-slate-800/60 to-slate-700/40 border border-slate-700/50 rounded-lg p-4 animate-slideInUp" style={{animationDelay: `${idx * 0.1}s`}}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-2xl font-bold text-white">{stat.value}</div>
                  <div className="text-sm text-slate-400 mt-1">{stat.label}</div>
                </div>
                <div className="text-2xl">{stat.icon}</div>
              </div>
            </div>
          ))}
        </div>

        {/* In Progress */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Play size={18} />
            In Progress
          </h2>
          <div className="grid grid-cols-3 gap-4">
            {inProgressCourses.map((course, idx) => (
              <div 
                key={course.id}
                className="bg-gradient-to-br from-slate-800/60 to-slate-700/40 border border-slate-700/50 rounded-lg overflow-hidden course-card group relative"
                onMouseEnter={() => setHoveredCourse(course.id)}
                onMouseLeave={() => setHoveredCourse(null)}
                style={{animation: `slideInUp 0.5s ease-out ${idx * 0.1}s both`}}
              >
                {/* Glow */}
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-blue-500/0 to-cyan-500/0 group-hover:from-blue-500/10 group-hover:via-blue-500/5 group-hover:to-cyan-500/10 pointer-events-none transition-all duration-500"></div>

                <div className="relative z-10">
                  <div className="h-24 bg-gradient-to-br from-slate-700/50 to-slate-800/50 flex items-center justify-center text-4xl group-hover:from-slate-600/60 group-hover:to-slate-700/60 transition-all">
                    <course.icon size={40} className="text-white" />
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-white text-sm line-clamp-2 group-hover:text-blue-300 transition-colors">{course.title}</h3>
                    <p className="text-xs text-slate-400 mt-1 group-hover:text-slate-300 transition-colors">{course.instructor}</p>
                    <div className="mt-3 space-y-2">
                      <div className="w-full bg-slate-700/50 rounded-full h-2 overflow-hidden">
                        <div className="progress-bar h-2 rounded-full transition-all" style={{'--progress': `${course.progress}%`}}></div>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-400">{course.progress}% Complete</span>
                        <span className="text-slate-500">{course.duration}</span>
                      </div>
                    </div>
                    <div className="course-actions flex gap-2 mt-3 pt-2 border-t border-slate-700/50">
                      <button 
                        onClick={() => showToast(`Resuming ${course.title}`)}
                        className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-1 rounded text-xs font-semibold transition-all hover:shadow-lg hover:shadow-blue-500/50"
                      >
                        <Play size={12} className="inline mr-1" /> Resume
                      </button>
                      <button 
                        onClick={() => showToast('Bookmarked!')}
                        className="p-1 hover:bg-slate-600/40 text-slate-300 hover:text-blue-300 rounded transition-all"
                      >
                        <Bookmark size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Completed */}
        <div>
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Award size={18} />
            Completed
          </h2>
          <div className="grid grid-cols-3 gap-4">
            {completedCourses.map((course, idx) => (
              <div 
                key={course.id}
                className="bg-gradient-to-br from-slate-800/60 to-slate-700/40 border border-slate-700/50 rounded-lg overflow-hidden course-card group relative"
                style={{animation: `slideInUp 0.5s ease-out ${(3 + idx) * 0.1}s both`}}
              >
                {/* Glow */}
                <div className="absolute inset-0 bg-gradient-to-r from-green-500/0 via-green-500/0 to-emerald-500/0 group-hover:from-green-500/10 group-hover:via-green-500/5 group-hover:to-emerald-500/10 pointer-events-none transition-all duration-500"></div>

                <div className="relative z-10">
                  <div className="h-24 bg-gradient-to-br from-green-600/20 to-emerald-600/20 flex items-center justify-center text-4xl relative group-hover:from-green-600/30 group-hover:to-emerald-600/30 transition-all">
                    <course.icon size={40} className="text-white" />
                    <div className="absolute top-2 right-2 w-6 h-6 bg-green-500/80 rounded-full flex items-center justify-center text-white text-xs transition-all group-hover:scale-110">✓</div>
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-white text-sm group-hover:text-green-300 transition-colors">{course.title}</h3>
                    <p className="text-xs text-slate-400 mt-1 group-hover:text-slate-300 transition-colors">{course.instructor}</p>
                    <div className="text-xs text-green-400 mt-3 font-semibold">Completed {course.date}</div>
                    <div className="course-actions flex gap-2 mt-2">
                      <button 
                        onClick={() => showToast(`Downloading certificate for ${course.title}`)}
                        className="flex-1 bg-green-600/20 hover:bg-green-600/30 text-green-300 border border-green-500/30 py-1 rounded text-xs font-semibold transition-all"
                      >
                        <Award size={12} className="inline mr-1" /> Certificate
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
