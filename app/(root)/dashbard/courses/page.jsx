// app/(root)/dashboard/courses/page.jsx
import { Button } from "@/components/ui/button";

export default function CoursesPage() {
  const enrolledCourses = [
    {
      id: 1,
      title: "Advanced React Patterns",
      instructor: "Sarah Johnson",
      provider: "Frontend Masters",
      progress: 85,
      duration: "24 hours",
      level: "Advanced",
      category: "Frontend",
      nextLesson: "State Management with Zustand",
      dueDate: "2024-04-10",
      certificate: true
    },
    {
      id: 2,
      title: "System Design Fundamentals",
      instructor: "Alex Chen",
      provider: "Educative",
      progress: 60,
      duration: "40 hours",
      level: "Intermediate",
      category: "Backend",
      nextLesson: "Database Scaling Strategies",
      dueDate: "2024-04-15",
      certificate: true
    },
    {
      id: 3,
      title: "Data Structures & Algorithms",
      instructor: "Mike Wilson",
      provider: "LeetCode",
      progress: 100,
      duration: "50 hours",
      level: "Intermediate",
      category: "Computer Science",
      nextLesson: "Course Completed",
      dueDate: "Completed",
      certificate: true
    },
    {
      id: 4,
      title: "AWS Certified Solutions Architect",
      instructor: "Amazon AWS",
      provider: "AWS Training",
      progress: 30,
      duration: "60 hours",
      level: "Advanced",
      category: "Cloud",
      nextLesson: "EC2 Deep Dive",
      dueDate: "2024-05-20",
      certificate: true
    }
  ];

  const recommendedCourses = [
    {
      id: 5,
      title: "Machine Learning Basics",
      instructor: "Andrew Ng",
      provider: "Coursera",
      duration: "56 hours",
      level: "Beginner",
      category: "Data Science",
      rating: 4.8,
      students: "1.2M",
      price: "Free"
    },
    {
      id: 6,
      title: "DevOps with Docker & Kubernetes",
      instructor: "Bret Fisher",
      provider: "Udemy",
      duration: "32 hours",
      level: "Intermediate",
      category: "DevOps",
      rating: 4.7,
      students: "85K",
      price: "$89.99"
    },
    {
      id: 7,
      title: "GraphQL API Development",
      instructor: "Eve Porcello",
      provider: "LinkedIn Learning",
      duration: "18 hours",
      level: "Intermediate",
      category: "Backend",
      rating: 4.6,
      students: "42K",
      price: "Free with Premium"
    }
  ];

  const stats = {
    enrolled: enrolledCourses.length,
    completed: enrolledCourses.filter(c => c.progress === 100).length,
    inProgress: enrolledCourses.filter(c => c.progress < 100 && c.progress > 0).length,
    certificates: enrolledCourses.filter(c => c.certificate && c.progress === 100).length
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">My Courses</h1>
          <p className="text-light-100">Continue learning and track your progress</p>
        </div>
        <Button className="btn-primary">Browse Courses</Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card-border">
          <div className="card p-4 text-center">
            <div className="text-2xl font-bold">{stats.enrolled}</div>
            <div className="text-sm text-light-100">Enrolled</div>
          </div>
        </div>
        <div className="card-border">
          <div className="card p-4 text-center">
            <div className="text-2xl font-bold text-primary-200">{stats.inProgress}</div>
            <div className="text-sm text-light-100">In Progress</div>
          </div>
        </div>
        <div className="card-border">
          <div className="card p-4 text-center">
            <div className="text-2xl font-bold text-success-100">{stats.completed}</div>
            <div className="text-sm text-light-100">Completed</div>
          </div>
        </div>
        <div className="card-border">
          <div className="card p-4 text-center">
            <div className="text-2xl font-bold">{stats.certificates}</div>
            <div className="text-sm text-light-100">Certificates</div>
          </div>
        </div>
      </div>

      {/* Enrolled Courses */}
      <section>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">Your Courses</h2>
          <Button variant="ghost" className="text-primary-200">
            View All
          </Button>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {enrolledCourses.map((course) => (
            <div key={course.id} className="card-border">
              <div className="card p-4">
                <h4 className="font-bold text-lg mb-2">{course.title}</h4>
                <p className="text-sm text-light-100 mb-2">Progress: {course.progress}%</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Recommended Courses */}
      <section>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">Recommended For You</h2>
          <Button variant="ghost" className="text-primary-200">
            See More
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {recommendedCourses.map((course) => (
            <div key={course.id} className="card-border">
              <div className="card p-4">
                <h4 className="font-bold text-lg mb-2">{course.title}</h4>
                <p className="text-sm text-light-100 mb-2">Rating: {course.rating}/5</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Learning Goals */}
      <div className="card-border">
        <div className="card p-6">
          <h2 className="text-xl font-bold mb-4">Weekly Learning Goals</h2>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm">Complete 5 hours of learning</span>
                <span className="text-sm font-bold">3/5 hours</span>
              </div>
              <div className="w-full bg-dark-200 rounded-full h-2">
                <div className="bg-primary-200 h-2 rounded-full" style={{ width: '60%' }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm">Finish 2 course modules</span>
                <span className="text-sm font-bold">1/2 modules</span>
              </div>
              <div className="w-full bg-dark-200 rounded-full h-2">
                <div className="bg-primary-200 h-2 rounded-full" style={{ width: '50%' }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm">Practice 10 coding problems</span>
                <span className="text-sm font-bold">7/10 problems</span>
              </div>
              <div className="w-full bg-dark-200 rounded-full h-2">
                <div className="bg-primary-200 h-2 rounded-full" style={{ width: '70%' }}></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}