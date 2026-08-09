'use client';

import { useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { BookOpen, ChevronDown, ExternalLink, Check, Award, X, Loader2, Sparkles, BrainCircuit, ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  getCourses,
  getUserProgress,
  updateUserProgress,
  getUserCertificates,
  generateCertificate
} from '@/lib/actions/courses.action';
import { toast } from 'sonner';

export default function CoursesPage() {
  const [courses, setCourses] = useState([]);
  const [progress, setProgress] = useState({});
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedCourse, setExpandedCourse] = useState(null);
  const [activeFilter, setActiveFilter] = useState('all');
  
  // Modal states
  const [activeModal, setActiveModal] = useState(null); // 'certificates' | 'progress' | 'suggest'
  const [suggestTopic, setSuggestTopic] = useState(null); // 'dsa' | 'sysdes' | 'dbms' | 'nosql'
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        const [coursesRes, progressRes, certsRes] = await Promise.all([
          getCourses(),
          getUserProgress(),
          getUserCertificates()
        ]);

        if (isMounted) {
          if (coursesRes.success) setCourses(coursesRes.courses);
          if (progressRes.success) setProgress(progressRes.progress);
          if (certsRes.success) setCertificates(certsRes.certificates);
        }
      } catch (err) {
        console.error("Failed to load courses page data:", err);
        if (isMounted) toast.error("Error loading courses data.");
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadData();

    // Socket Real-time Sync
    const isLocal = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
    const socketUrl = isLocal ? 'http://localhost:4002' : (process.env.NEXT_PUBLIC_SOCKET_IO_URL || 'http://localhost:4002');
    
    console.log(`🔌 Courses page connecting to socket server: ${socketUrl}`);
    const socket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
    });

    socket.on("content-updated", ({ contentType }) => {
      if (contentType === "courses") {
        console.log("🔄 Real-time courses update triggered!");
        loadData();
      }
    });

    return () => {
      isMounted = false;
      socket.disconnect();
    };
  }, []);

  const toggleCourse = (courseId) => {
    setExpandedCourse(expandedCourse === courseId ? null : courseId);
  };

  const isResourceCompleted = (courseId, resourceName) => {
    return progress[courseId]?.completedResources?.includes(resourceName) || false;
  };

  const handleToggleResource = async (courseId, resourceName) => {
    try {
      const isCurrentlyCompleted = isResourceCompleted(courseId, resourceName);
      const res = await updateUserProgress(courseId, resourceName, !isCurrentlyCompleted);

      if (res.success) {
        setProgress(res.progress);
        toast.success(isCurrentlyCompleted ? "Marked incomplete" : "Marked complete!");

        // If the course just got fully completed, show a congratulatory message
        if (res.progress[courseId]?.completed && !progress[courseId]?.completed) {
          toast.success(`🎉 Congratulations! You have completed the ${courseId.toUpperCase()} curriculum! You can now claim your certificate.`, {
            duration: 5000,
          });
          // Reload certificates list
          const certsRes = await getUserCertificates();
          if (certsRes.success) setCertificates(certsRes.certificates);
        }
      } else {
        toast.error(res.error || "Failed to update progress.");
      }
    } catch (err) {
      console.error(err);
      toast.error("An error occurred.");
    }
  };

  const handleClaimCertificate = async (courseId, courseTitle) => {
    try {
      setActionLoading(true);
      const res = await generateCertificate(courseId, courseTitle);
      if (res.success) {
        toast.success("Certificate generated successfully!");
        const certsRes = await getUserCertificates();
        if (certsRes.success) setCertificates(certsRes.certificates);
      } else {
        toast.error(res.error || "Failed to generate certificate.");
      }
    } catch (err) {
      console.error(err);
      toast.error("An error occurred.");
    } finally {
      setActionLoading(false);
    }
  };

  const getCourseProgressPercentage = (course) => {
    const totalResources = course.resources?.length || 0;
    if (totalResources === 0) return 0;
    const completed = progress[course.id]?.completedResources?.length || 0;
    return Math.round((completed / totalResources) * 100);
  };

  const filteredCourses = activeFilter === 'all' ? courses : courses.filter(c => {
    if (activeFilter === 'inprogress') {
      return progress[c.id]?.completedResources?.length > 0 && !progress[c.id]?.completed;
    }
    return c.id === activeFilter;
  });

  const getSuggestedCourse = () => {
    switch (suggestTopic) {
      case 'dsa':
        return {
          title: "DSA (Data Structures and Algorithms)",
          reason: "These topics are widely used in interviews to evaluate logic building and problem-solving capabilities.",
          recommendation: "You should start with the NeetCode Roadmap and solve Easy/Medium LeetCode problems side-by-side."
        };
      case 'sysdes':
        return {
          title: "System Design",
          reason: "This evaluates your capacity to design architectures, handle scaling, load balancing, and design distributed systems for mid-to-senior roles.",
          recommendation: "Alex Xu's ByteByteGo and Gaurav Sen's System Design lectures are the best starting resources."
        };
      case 'dbms':
        return {
          title: "DBMS (Relational Databases)",
          reason: "Transactions, Normalization, and complex SQL query optimization are essential to demonstrate backend developer capability.",
          recommendation: "Start with SQLBolt for interactive practice, then move to CMU Database Group's advanced deep dive."
        };
      case 'nosql':
        return {
          title: "NoSQL Databases",
          reason: "Scaling requirements, caching layers, and unstructured data storage systems play a vital role in modern applications.",
          recommendation: "Redis University & MongoDB University courses are free, highly rated, and official."
        };
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-dark-100 to-dark-200 pb-16">
      {/* Header */}
      <div className="sticky top-0 z-40 border-b border-dark-300 bg-dark-100/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 md:gap-0">
            <div>
              <p className="text-xs sm:text-sm text-light-400">Learn › <span className="text-light-200 font-medium">Courses</span></p>
              <h1 className="text-2xl sm:text-3xl font-bold text-light-50 mt-2">Master Key Topics</h1>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <button 
                onClick={() => setActiveModal('certificates')}
                className="px-3 sm:px-4 py-2 rounded-lg bg-dark-300 hover:bg-dark-400 text-light-200 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap flex items-center gap-2"
              >
                <Award className="w-4 h-4 text-primary-100" />
                My Certificates
              </button>
              <button 
                onClick={() => setActiveModal('progress')}
                className="px-3 sm:px-4 py-2 rounded-lg bg-dark-300 hover:bg-dark-400 text-light-200 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap flex items-center gap-2"
              >
                <Check className="w-4 h-4 text-emerald-400" />
                My Progress
              </button>
              <button 
                onClick={() => {
                  setActiveModal('suggest');
                  setSuggestTopic(null);
                }}
                className="px-3 sm:px-4 py-2 rounded-lg bg-primary-200 hover:bg-primary-300 text-dark-100 text-xs sm:text-sm font-bold transition-colors whitespace-nowrap flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                Suggest a Course
              </button>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
          <Loader2 className="w-8 h-8 text-primary-100 animate-spin" />
          <p className="text-light-400 text-sm">Loading course curriculum...</p>
        </div>
      ) : (
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          {/* Hero Section */}
          <div className="mt-8 border-b border-dark-300 pb-12">
            <div className="bg-gradient-to-br from-dark-200 to-dark-300 border border-dark-300 rounded-2xl p-4 sm:p-6 md:p-8">
              <div className="flex items-center gap-3 sm:gap-4 mb-4">
                <div className="w-10 sm:w-12 h-10 sm:h-12 rounded-lg bg-primary-200/20 flex items-center justify-center flex-shrink-0">
                  <BookOpen className="w-5 sm:w-6 h-5 sm:h-6 text-primary-100" />
                </div>
                <div className="inline-block bg-primary-200/20 border border-primary-200/40 rounded-full px-2 sm:px-3 py-1">
                  <span className="text-primary-100 text-xs font-bold uppercase tracking-wide">Complete Curriculum</span>
                </div>
              </div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-light-50 mb-3">Master Coding Interviews</h2>
              <p className="text-light-300 text-sm sm:text-base md:text-lg mb-6 max-w-2xl">
                Structured paths with curated resources from the best teachers and platforms. Learn at your pace and master the fundamentals.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
                <button 
                  onClick={() => {
                    if (courses.length > 0) toggleCourse(courses[0].id);
                  }}
                  className="px-4 sm:px-5 py-2 rounded-lg bg-primary-200 hover:bg-primary-300 text-dark-100 font-bold transition-colors text-sm sm:text-base"
                >
                  Get Started Now
                </button>
              </div>
            </div>
          </div>

          {/* Filter Pills */}
          <div className="border-b border-dark-300 py-6">
            <div className="flex flex-wrap gap-2 sm:gap-3">
              {['all', 'dsa', 'sysdes', 'dbms', 'nosql'].map((filter) => (
                <button
                  key={filter}
                  onClick={() => setActiveFilter(filter)}
                  className={cn(
                    'px-4 py-2 rounded-full text-sm font-semibold transition-all',
                    activeFilter === filter
                      ? 'bg-primary-200/40 border border-primary-200 text-primary-100'
                      : 'bg-dark-300 border border-dark-400 text-light-300 hover:border-dark-300'
                  )}
                >
                  {filter === 'all' && 'All Courses'}
                  {filter === 'dsa' && 'DSA'}
                  {filter === 'sysdes' && 'System Design'}
                  {filter === 'dbms' && 'DBMS'}
                  {filter === 'nosql' && 'NoSQL'}
                </button>
              ))}
            </div>
          </div>

          {/* Main Content */}
          <div className="py-8">
            <div className="space-y-6">
              {filteredCourses.map((course) => {
                const progressPercent = getCourseProgressPercentage(course);
                const isFinished = progress[course.id]?.completed || false;
                const hasCertificate = certificates.some(c => c.courseId === course.id);

                return (
                  <div key={course.id} className="overflow-hidden border border-dark-300 rounded-xl hover:border-dark-200 transition-colors">
                    {/* Course Header */}
                    <div
                      onClick={() => toggleCourse(course.id)}
                      className="p-4 sm:p-6 cursor-pointer hover:bg-dark-300/50 transition-colors bg-dark-200/50"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 rounded-lg bg-dark-300 flex items-center justify-center">
                              <span className="text-lg font-bold text-primary-100">{(course.badge || course.title || 'C').charAt(0)}</span>
                            </div>
                            <div>
                              <h3 className="text-xl font-bold text-light-50 flex items-center gap-2">
                                {course.title}
                                {isFinished && <Check className="w-5 h-5 text-emerald-400" />}
                              </h3>
                              <p className="text-sm text-light-400">{course.subtitle}</p>
                            </div>
                          </div>

                          {/* Progress Bar */}
                          <div className="mt-4 max-w-md">
                            <div className="flex justify-between text-xs text-light-400 mb-1">
                              <span>Curriculum Progress</span>
                              <span>{progressPercent}%</span>
                            </div>
                            <div className="w-full h-1.5 bg-dark-300 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-emerald-400 transition-all duration-500" 
                                style={{ width: `${progressPercent}%` }}
                              />
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
                          {isFinished && !hasCertificate && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleClaimCertificate(course.id, course.title);
                              }}
                              className="px-3 py-1 text-xs rounded bg-emerald-400 hover:bg-emerald-500 text-dark-100 font-bold transition-colors flex items-center gap-1"
                            >
                              <Award className="w-3.5 h-3.5" />
                              Claim Cert
                            </button>
                          )}
                          {hasCertificate && (
                            <span className="text-xs bg-emerald-400/20 text-emerald-400 font-semibold px-2.5 py-1 rounded-full border border-emerald-400/40 flex items-center gap-1">
                              <Award className="w-3.5 h-3.5" />
                              Certified
                            </span>
                          )}

                          <div className={cn(
                            'text-xs font-bold px-2 sm:px-3 py-1 rounded-full whitespace-nowrap',
                            course.color === 'cyan' && 'bg-cyan-500/10 border border-cyan-500/20 dark:bg-cyan-500/20 dark:border-cyan-500/40 text-cyan-700 dark:text-cyan-200',
                            course.color === 'violet' && 'bg-violet-500/10 border border-violet-500/20 dark:bg-violet-500/20 dark:border-violet-500/40 text-violet-700 dark:text-violet-200',
                            course.color === 'orange' && 'bg-orange-500/10 border border-orange-500/20 dark:bg-orange-500/20 dark:border-orange-500/40 text-orange-700 dark:text-orange-200',
                            course.color === 'emerald' && 'bg-emerald-500/10 border border-emerald-500/20 dark:bg-emerald-500/20 dark:border-emerald-500/40 text-emerald-700 dark:text-emerald-200',
                          )}>
                            {course.resources?.length || 0} Resources
                          </div>
                          <ChevronDown className={cn(
                            'w-4 sm:w-5 h-4 sm:h-5 text-light-400 transition-transform duration-300 flex-shrink-0',
                            expandedCourse === course.id && 'rotate-180'
                          )} />
                        </div>
                      </div>
                    </div>

                    {/* Resources Grid */}
                    {expandedCourse === course.id && (
                      <div className="border-t border-dark-300 bg-dark-300/30 p-4 sm:p-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                          {course.resources?.map((resource, idx) => {
                            const isCompleted = isResourceCompleted(course.id, resource.name);
                            return (
                              <div
                                key={idx}
                                className={cn(
                                  'group p-4 rounded-lg border transition-all hover:scale-[1.02] flex flex-col justify-between',
                                  'bg-dark-300/50 border-dark-200 hover:border-primary-200/50 hover:bg-dark-300'
                                )}
                              >
                                <div>
                                  <div className="flex items-start justify-between mb-3">
                                    {/* Completion Checkmark */}
                                    <button
                                      onClick={() => handleToggleResource(course.id, resource.name)}
                                      className={cn(
                                        "w-6 h-6 rounded-md flex items-center justify-center border transition-all",
                                        isCompleted
                                          ? "bg-emerald-400 border-emerald-400 text-dark-100"
                                          : "border-dark-400 hover:border-emerald-400 text-transparent"
                                      )}
                                    >
                                      <Check className="w-4 h-4 text-inherit stroke-[3px]" />
                                    </button>

                                    <span className="text-xs px-2 py-1 rounded-full bg-primary-200/20 text-primary-100 font-medium">
                                      {resource.type}
                                    </span>
                                  </div>
                                  <h4 className="font-semibold text-light-100 text-sm mb-1">
                                    {resource.name}
                                  </h4>
                                  <p className="text-xs text-light-400 mb-4">
                                    {resource.desc}
                                  </p>
                                </div>

                                <a
                                  href={resource.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="w-full py-1.5 px-3 rounded bg-dark-400 hover:bg-dark-300 text-light-200 text-xs font-semibold flex items-center justify-center gap-1.5 border border-dark-300 hover:border-dark-200 transition-colors"
                                >
                                  Go to Resource
                                  <ExternalLink className="w-3 h-3 text-light-400" />
                                </a>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Stats */}
            <div className="mt-12 sm:mt-16 grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
              {[
                { label: 'Total Courses', value: courses.length.toString() },
                { 
                  label: 'Completed Resources', 
                  value: Object.values(progress).reduce((acc, curr) => acc + (curr.completedResources?.length || 0), 0).toString() 
                },
                { label: 'Earned Certificates', value: certificates.length.toString() },
                { label: 'Success Rate', value: '95%' },
              ].map((stat, idx) => (
                <div key={idx} className="bg-dark-300/50 border border-dark-300 rounded-lg p-3 sm:p-6 text-center hover:border-primary-200/30 transition-colors">
                  <div className="text-xl sm:text-2xl font-bold text-light-50">{stat.value}</div>
                  <div className="text-xs text-light-400 mt-1">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal - Certificates */}
      {activeModal === 'certificates' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/70 backdrop-blur-xs" onClick={() => setActiveModal(null)} />
          <div className="bg-dark-200 border border-dark-300 rounded-2xl w-full max-w-lg z-10 overflow-hidden relative">
            <button 
              onClick={() => setActiveModal(null)}
              className="absolute top-4 right-4 text-light-400 hover:text-light-100 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
            <div className="p-6 border-b border-dark-300">
              <h3 className="text-xl font-bold text-light-50 flex items-center gap-2">
                <Award className="w-6 h-6 text-primary-100" />
                My Certificates
              </h3>
              <p className="text-xs text-light-400 mt-1">Complete the courses and resources to claim your certificate</p>
            </div>
            <div className="p-6 max-h-[300px] overflow-y-auto space-y-3">
              {certificates.length === 0 ? (
                <div className="text-center py-8 text-light-400 text-sm">
                  No certificate has been generated yet. Complete 100% of the curriculum to claim your certificate!!
                </div>
              ) : (
                certificates.map((cert) => (
                  <div key={cert.id} className="p-4 rounded-xl border border-dark-300 bg-dark-300/30 flex items-center justify-between gap-4">
                    <div>
                      <h4 className="text-sm font-semibold text-light-100">{cert.courseTitle}</h4>
                      <p className="text-[10px] text-light-400 mt-0.5">ID: {cert.certificateId} | Issued: {new Date(cert.issueDate).toLocaleDateString()}</p>
                    </div>
                    <Award className="w-8 h-8 text-emerald-400 shrink-0" />
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal - Progress */}
      {activeModal === 'progress' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/70 backdrop-blur-xs" onClick={() => setActiveModal(null)} />
          <div className="bg-dark-200 border border-dark-300 rounded-2xl w-full max-w-lg z-10 overflow-hidden relative">
            <button 
              onClick={() => setActiveModal(null)}
              className="absolute top-4 right-4 text-light-400 hover:text-light-100 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
            <div className="p-6 border-b border-dark-300">
              <h3 className="text-xl font-bold text-light-50 flex items-center gap-2">
                <Check className="w-6 h-6 text-emerald-400" />
                My Progress
              </h3>
              <p className="text-xs text-light-400 mt-1">Har course ka overall learning state track karein.</p>
            </div>
            <div className="p-6 max-h-[300px] overflow-y-auto space-y-4">
              {courses.map((course) => {
                const total = course.resources?.length || 0;
                const completed = progress[course.id]?.completedResources?.length || 0;
                const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
                
                return (
                  <div key={course.id} className="space-y-1.5">
                    <div className="flex justify-between text-xs text-light-200">
                      <span className="font-semibold">{course.title}</span>
                      <span>{completed}/{total} Completed</span>
                    </div>
                    <div className="w-full h-2.5 bg-dark-300 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-emerald-400 transition-all duration-300"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Modal - Suggest a Course */}
      {activeModal === 'suggest' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/70 backdrop-blur-xs" onClick={() => setActiveModal(null)} />
          <div className="bg-dark-200 border border-dark-300 rounded-2xl w-full max-w-xl z-10 overflow-hidden relative">
            <button 
              onClick={() => setActiveModal(null)}
              className="absolute top-4 right-4 text-light-400 hover:text-light-100 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
            <div className="p-6 border-b border-dark-300">
              <h3 className="text-xl font-bold text-light-50 flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-primary-100 animate-pulse" />
                Suggest a Course Wizard
              </h3>
              <p className="text-xs text-light-400 mt-1">What would you like to learn? Select a topic to get instant, curated recommendations.</p>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="space-y-3">
                <label className="text-sm font-semibold text-light-200">Which Topic Do You Want to Learn?</label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { id: 'dsa', label: 'DSA', desc: 'Algorithms & logic' },
                    { id: 'sysdes', label: 'System Design', desc: 'Architecture & Scale' },
                    { id: 'dbms', label: 'DBMS', desc: 'SQL & Database Engines' },
                    { id: 'nosql', label: 'NoSQL', desc: 'Key-Value, Document DBs' },
                  ].map((topic) => (
                    <button
                      key={topic.id}
                      onClick={() => setSuggestTopic(topic.id)}
                      className={cn(
                        "p-4 rounded-xl border text-left transition-all",
                        suggestTopic === topic.id
                          ? "bg-primary-200/10 border-primary-200 shadow-md"
                          : "bg-dark-300 border-dark-400 hover:border-dark-300"
                      )}
                    >
                      <h4 className="text-sm font-bold text-light-100">{topic.label}</h4>
                      <p className="text-[10px] text-light-400 mt-0.5">{topic.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Suggestions result card */}
              {suggestTopic && (
                <div className="p-4 rounded-xl border border-primary-200/20 bg-primary-200/5 animate-fade-in space-y-3">
                  <div className="flex items-center gap-2">
                    <BrainCircuit className="w-5 h-5 text-primary-100" />
                    <h4 className="text-sm font-bold text-primary-100">{getSuggestedCourse()?.title} Recommendation</h4>
                  </div>
                  <div>
                    <h5 className="text-xs font-semibold text-light-200">Why to Learn:</h5>
                    <p className="text-xs text-light-300 mt-0.5 leading-relaxed">{getSuggestedCourse()?.reason}</p>
                  </div>
                  <div>
                    <h5 className="text-xs font-semibold text-light-200">Best Road Ahead:</h5>
                    <p className="text-xs text-light-300 mt-0.5 leading-relaxed">{getSuggestedCourse()?.recommendation}</p>
                  </div>
                  <button
                    onClick={() => {
                      toggleCourse(suggestTopic);
                      setActiveFilter(suggestTopic);
                      setActiveModal(null);
                    }}
                    className="w-full mt-2 py-2 px-4 rounded-lg bg-primary-200 hover:bg-primary-300 text-dark-100 text-xs font-bold transition-all"
                  >
                    View Curriculum
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
