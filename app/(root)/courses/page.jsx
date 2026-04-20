'use client';

import { useState } from 'react';
import { BookOpen, ChevronDown, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function CoursesPage() {
  const [expandedCourse, setExpandedCourse] = useState(null);
  const [activeFilter, setActiveFilter] = useState('all');

  const courses = [
    {
      id: 'dsa',
      title: 'DSA (Data Structures and Algorithms)',
      subtitle: 'Pattern recognition aur practice sabse zyada zaroori',
      badge: 'DSA',
      color: 'cyan',
      colorClass: 'from-cyan-500 to-cyan-600',
      bgClass: 'bg-cyan-500/10 border-cyan-500/30',
      resources: [
        {
          name: 'NeetCode',
          desc: 'Roadmap & Video Solutions',
          type: 'Platform',
          url: 'https://neetcode.io/',
        },
        {
          name: 'LeetCode',
          desc: 'Practice Platform',
          type: 'Practice',
          url: 'https://leetcode.com/',
        },
        {
          name: 'Abdul Bari Algorithms',
          desc: 'YouTube - White-board Logic',
          type: 'Video',
          url: 'https://www.youtube.com/c/abdul_bari',
        },
        {
          name: 'MIT OpenCourseWare (6.006)',
          desc: 'University-level Deep Dive',
          type: 'Course',
          url: 'https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-fall-2011/',
        },
        {
          name: 'GeeksforGeeks',
          desc: 'Articles & Code Reference',
          type: 'Resource',
          url: 'https://www.geeksforgeeks.org/data-structures/',
        },
        {
          name: 'HackerRank',
          desc: 'Beginner-friendly Practice',
          type: 'Practice',
          url: 'https://www.hackerrank.com/domains/data-structures',
        },
        {
          name: 'Coursera - Stanford Algorithms',
          desc: 'Tim Roughgarden - Mathematical Approach',
          type: 'Course',
          url: 'https://www.coursera.org/specializations/algorithms',
        },
      ]
    },
    {
      id: 'sysdes',
      title: 'System Design',
      subtitle: 'Real-world architecture aur trade-offs samajhna',
      badge: 'SYSDES',
      color: 'violet',
      colorClass: 'from-violet-500 to-violet-600',
      bgClass: 'bg-violet-500/10 border-violet-500/30',
      resources: [
        {
          name: 'ByteByteGo (Alex Xu)',
          desc: 'Course & Book',
          type: 'Course',
          url: 'https://bytebytego.com/',
        },
        {
          name: 'Grokking System Design',
          desc: 'DesignGurus - Text-based Course',
          type: 'Course',
          url: 'https://www.designgurus.io/course/grokking-the-system-design-interview',
        },
        {
          name: 'System Design Primer',
          desc: 'GitHub - Free Collection',
          type: 'Resource',
          url: 'https://github.com/donnemartin/system-design-primer',
        },
        {
          name: 'Gaurav Sen YouTube',
          desc: 'Load Balancers, Caching, Microservices',
          type: 'Video',
          url: 'https://www.youtube.com/c/GauravSensei',
        },
        {
          name: 'InfoQ Architecture',
          desc: 'Tech Talks & Case Studies',
          type: 'Resource',
          url: 'https://www.infoq.com/architecture-design/',
        },
        {
          name: 'High Scalability',
          desc: 'Real-world Architecture Blog',
          type: 'Blog',
          url: 'http://highscalability.com/',
        },
        {
          name: 'Hussein Nasser YouTube',
          desc: 'Backend Engineering & Protocols',
          type: 'Video',
          url: 'https://www.youtube.com/c/HusseinNasser-software-engineering',
        },
      ]
    },
    {
      id: 'dbms',
      title: 'DBMS (Relational Database Management Systems)',
      subtitle: 'SQL se lekar database engines tak sab seekhna',
      badge: 'DBMS',
      color: 'orange',
      colorClass: 'from-orange-500 to-orange-600',
      bgClass: 'bg-orange-500/10 border-orange-500/30',
      resources: [
        {
          name: 'CMU Database Group',
          desc: 'Andy Pavlo - 15-445/645',
          type: 'Course',
          url: 'https://www.youtube.com/c/CMUDatabaseGroup',
        },
        {
          name: 'SQLBolt',
          desc: 'Interactive SQL Tutorial',
          type: 'Tutorial',
          url: 'https://sqlbolt.com/',
        },
        {
          name: 'Mode Analytics SQL',
          desc: 'Basic to Advanced SQL',
          type: 'Tutorial',
          url: 'https://mode.com/sql-tutorial/',
        },
        {
          name: 'LeetCode Database',
          desc: 'Complex SQL Practice',
          type: 'Practice',
          url: 'https://leetcode.com/problemset/database/',
        },
        {
          name: 'PostgreSQL Tutorial',
          desc: 'Official Documentation',
          type: 'Resource',
          url: 'https://www.postgresqltutorial.com/',
        },
        {
          name: 'Stanford Databases (EdX)',
          desc: 'Jennifer Widom - Relational Algebra',
          type: 'Course',
          url: 'https://online.stanford.edu/courses/soe-ydatabases-databases',
        },
        {
          name: 'GeeksforGeeks DBMS',
          desc: 'Normalization, ACID, Concurrency',
          type: 'Resource',
          url: 'https://www.geeksforgeeks.org/dbms/',
        },
      ]
    },
    {
      id: 'nosql',
      title: 'NoSQL',
      subtitle: 'Document, Key-Value, Column, Graph Databases',
      badge: 'NOSQL',
      color: 'emerald',
      colorClass: 'from-emerald-500 to-emerald-600',
      bgClass: 'bg-emerald-500/10 border-emerald-500/30',
      resources: [
        {
          name: 'MongoDB University',
          desc: 'Free Official Courses',
          type: 'Course',
          url: 'https://learn.mongodb.com/',
        },
        {
          name: 'Redis University',
          desc: 'Free Official Courses',
          type: 'Course',
          url: 'https://redis.io/university/',
        },
        {
          name: 'DynamoDB Guide',
          desc: 'Alex DeBrie - Single-table Design',
          type: 'Guide',
          url: 'https://www.dynamodbguide.com/',
        },
        {
          name: 'Neo4j GraphAcademy',
          desc: 'Graph Databases',
          type: 'Course',
          url: 'https://graphacademy.neo4j.com/',
        },
        {
          name: 'DataStax Academy',
          desc: 'Apache Cassandra',
          type: 'Course',
          url: 'https://academy.datastax.com/',
        },
        {
          name: 'AWS NoSQL Explainer',
          desc: 'When to use which database',
          type: 'Resource',
          url: 'https://aws.amazon.com/nosql/',
        },
        {
          name: 'Couchbase Developer Academy',
          desc: 'Document Database Concepts',
          type: 'Course',
          url: 'https://developer.couchbase.com/tutorial-quickstart',
        },
      ]
    },
  ];

  const toggleCourse = (courseId) => {
    setExpandedCourse(expandedCourse === courseId ? null : courseId);
  };

  const filteredCourses = activeFilter === 'all' ? courses : courses.filter(c => {
    if (activeFilter === 'inprogress') return ['dsa'].includes(c.id);
    return c.id === activeFilter;
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-dark-100 to-dark-200">
      {/* Header */}
      <div className="sticky top-0 z-40 border-b border-dark-300 bg-dark-100/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-light-400">Learn › <span className="text-light-200 font-medium">Courses</span></p>
              <h1 className="text-3xl font-bold text-light-50 mt-2">Master Key Topics</h1>
            </div>
            <div className="flex gap-3">
              <button className="px-4 py-2 rounded-lg bg-dark-300 hover:bg-dark-400 text-light-200 text-sm font-medium transition-colors">
                My Certificates
              </button>
              <button className="px-4 py-2 rounded-lg bg-dark-300 hover:bg-dark-400 text-light-200 text-sm font-medium transition-colors">
                My Progress
              </button>
              <button className="px-4 py-2 rounded-lg bg-primary-200 hover:bg-primary-300 text-dark-100 text-sm font-bold transition-colors">
                Suggest a Course
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <div className="border-b border-dark-300">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="bg-gradient-to-br from-dark-200 to-dark-300 border border-dark-300 rounded-2xl p-8">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-lg bg-primary-200/20 flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-primary-100" />
              </div>
              <div className="inline-block bg-primary-200/20 border border-primary-200/40 rounded-full px-3 py-1">
                <span className="text-primary-100 text-xs font-bold uppercase tracking-wide">Complete Curriculum</span>
              </div>
            </div>
            <h2 className="text-4xl font-bold text-light-50 mb-3">Master Coding Interviews</h2>
            <p className="text-light-300 text-lg mb-6 max-w-2xl">
              Structured paths with curated resources from the best teachers and platforms. Learn at your pace and master the fundamentals.
            </p>
            <div className="flex gap-3 flex-wrap">
              <button className="px-5 py-2 rounded-lg bg-primary-200 hover:bg-primary-300 text-dark-100 font-bold transition-colors">
                Get Started Now
              </button>
              <button className="px-5 py-2 rounded-lg border border-dark-300 hover:bg-dark-400 text-light-200 font-medium transition-colors">
                View All Resources
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Pills */}
      <div className="border-b border-dark-300 bg-dark-200/50">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex flex-wrap gap-3">
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
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="space-y-6">
          {filteredCourses.map((course) => (
            <div key={course.id} className="overflow-hidden border border-dark-300 rounded-xl hover:border-dark-200 transition-colors">
              {/* Course Header */}
              <div
                onClick={() => toggleCourse(course.id)}
                className="p-6 cursor-pointer hover:bg-dark-300/50 transition-colors bg-dark-200/50"
              >
                <div className="flex items-start justify-between gap-6">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 rounded-lg bg-dark-300 flex items-center justify-center">
                        <span className="text-lg font-bold text-primary-100">{course.badge.charAt(0)}</span>
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-light-50">{course.title}</h3>
                        <p className="text-sm text-light-400">{course.subtitle}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      'text-xs font-bold px-3 py-1 rounded-full text-white',
                      course.colorClass === 'from-cyan-500 to-cyan-600' && 'bg-cyan-500/20 border border-cyan-500/40 text-cyan-200',
                      course.colorClass === 'from-violet-500 to-violet-600' && 'bg-violet-500/20 border border-violet-500/40 text-violet-200',
                      course.colorClass === 'from-orange-500 to-orange-600' && 'bg-orange-500/20 border border-orange-500/40 text-orange-200',
                      course.colorClass === 'from-emerald-500 to-emerald-600' && 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-200',
                    )}>
                      {course.resources.length} Resources
                    </div>
                    <ChevronDown className={cn(
                      'w-5 h-5 text-light-400 transition-transform duration-300',
                      expandedCourse === course.id && 'rotate-180'
                    )} />
                  </div>
                </div>
              </div>

              {/* Resources Grid */}
              {expandedCourse === course.id && (
                <div className="border-t border-dark-300 bg-dark-300/30 p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {course.resources.map((resource, idx) => (
                      <a
                        key={idx}
                        href={resource.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={cn(
                          'group p-4 rounded-lg border transition-all hover:scale-105 hover:shadow-lg',
                          'bg-dark-300/50 border-dark-200 hover:border-primary-200/50 hover:bg-dark-300'
                        )}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="w-8 h-8 rounded-lg bg-dark-200 flex items-center justify-center flex-shrink-0">
                            <ExternalLink className="w-4 h-4 text-light-400" />
                          </div>
                          <span className="text-xs px-2 py-1 rounded-full bg-primary-200/20 text-primary-100 font-medium ml-2">
                            {resource.type}
                          </span>
                        </div>
                        <h4 className="font-semibold text-light-100 text-sm mb-1 group-hover:text-primary-100">
                          {resource.name}
                        </h4>
                        <p className="text-xs text-light-400">
                          {resource.desc}
                        </p>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Stats */}
        <div className="mt-16 grid grid-cols-4 gap-4">
          {[
            { label: 'Total Courses', value: '4' },
            { label: 'Total Resources', value: '28+' },
            { label: 'Hours of Content', value: '200+' },
            { label: 'Success Rate', value: '95%' },
          ].map((stat, idx) => (
            <div key={idx} className="bg-dark-300/50 border border-dark-300 rounded-lg p-6 text-center hover:border-primary-200/30 transition-colors">
              <div className="text-2xl font-bold text-light-50">{stat.value}</div>
              <div className="text-xs text-light-400 mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
