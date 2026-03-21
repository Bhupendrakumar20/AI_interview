// app/admin/page.jsx
import { getSystemStats } from "@/lib/actions/admin.action";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Users,
  Briefcase,
  Trophy,
  GraduationCap,
  FileText,
  BarChart3,
  Download,
  Upload,
  Shield
} from "lucide-react";

export default async function AdminDashboard() {
  const { success, stats } = await getSystemStats();
  
  if (!success) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500">Failed to load system statistics</p>
      </div>
    );
  }

  const statCards = [
    {
      title: "Total Users",
      value: stats.users || 0,
      icon: Users,
      color: "bg-blue-500",
      change: "+12%",
      href: "/admin/users"
    },
    {
      title: "Interviews",
      value: stats.interviews || 0,
      icon: FileText,
      color: "bg-green-500",
      change: "+8%",
      href: "/admin/interviews"
    },
    {
      title: "Internships",
      value: stats.internships || 0,
      icon: Briefcase,
      color: "bg-purple-500",
      change: "+15%",
      href: "/admin/internships"
    },
    {
      title: "Jobs",
      value: stats.jobs || 0,
      icon: Briefcase,
      color: "bg-yellow-500",
      change: "+5%",
      href: "/admin/jobs"
    },
    {
      title: "Competitions",
      value: stats.competitions || 0,
      icon: Trophy,
      color: "bg-pink-500",
      change: "+20%",
      href: "/admin/competitions"
    },
    {
      title: "Courses",
      value: stats.courses || 0,
      icon: GraduationCap,
      color: "bg-indigo-500",
      change: "+10%",
      href: "/admin/courses"
    }
  ];

  const quickActions = [
    {
      title: "Add New User",
      description: "Create a new user account",
      icon: Users,
      href: "/admin/users/new",
      color: "bg-blue-100 text-blue-600"
    },
    {
      title: "Add Internship",
      description: "Create new internship opportunity",
      icon: Briefcase,
      href: "/admin/internships/new",
      color: "bg-green-100 text-green-600"
    },
    {
      title: "Add Course",
      description: "Add new course to platform",
      icon: GraduationCap,
      href: "/admin/courses/new",
      color: "bg-purple-100 text-purple-600"
    },
    {
      title: "View Analytics",
      description: "Detailed platform analytics",
      icon: BarChart3,
      href: "/admin/analytics",
      color: "bg-yellow-100 text-yellow-600"
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-gray-500 dark:text-light-100">
            Welcome to Prepwise Admin Panel
          </p>
        </div>
        <div className="flex gap-3">
          <Button className="btn-secondary">
            <Download className="h-4 w-4 mr-2" />
            Export Data
          </Button>
          <Button className="btn-primary">
            <Upload className="h-4 w-4 mr-2" />
            Import Data
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <div className={`p-2 rounded-full ${stat.color}`}>
                <stat.icon className="h-4 w-4 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-green-600">{stat.change} from last month</p>
              <Button
                variant="ghost"
                size="sm"
                className="mt-2 text-xs"
                onClick={() => window.location.href = stat.href}
              >
                View Details →
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {quickActions.map((action) => (
          <Card key={action.title} className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-lg ${action.color}`}>
                  <action.icon className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-semibold">{action.title}</h3>
                  <p className="text-sm text-gray-500">{action.description}</p>
                </div>
              </div>
              <Button
                variant="outline"
                className="w-full mt-4"
                onClick={() => window.location.href = action.href}
              >
                Go to {action.title}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Recent Admin Activity</CardTitle>
            <Button variant="ghost" size="sm">
              View All
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {stats.recentActivity?.slice(0, 5).map((log) => (
              <div key={log.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-dark-300 rounded-lg">
                <div className="flex items-center gap-3">
                  <Shield className="h-5 w-5 text-gray-400" />
                  <div>
                    <p className="font-medium">{log.action.replace(/_/g, ' ')}</p>
                    <p className="text-sm text-gray-500">
                      User ID: {log.userId} • {new Date(log.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
                <span className="px-2 py-1 bg-blue-100 text-blue-600 text-xs rounded-full">
                  {log.adminId}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* System Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>System Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { service: "Firebase Auth", status: "operational", uptime: "99.9%" },
                { service: "Firestore Database", status: "operational", uptime: "99.8%" },
                { service: "AI Services", status: "operational", uptime: "99.5%" },
                { service: "Email Service", status: "degraded", uptime: "95.2%" },
                { service: "File Storage", status: "operational", uptime: "99.7%" }
              ].map((service) => (
                <div key={service.service} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{service.service}</p>
                    <p className="text-sm text-gray-500">Uptime: {service.uptime}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs ${
                    service.status === 'operational' 
                      ? 'bg-green-100 text-green-600' 
                      : 'bg-yellow-100 text-yellow-600'
                  }`}>
                    {service.status}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Database Operations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Button className="w-full justify-start" variant="outline">
                Backup Database
              </Button>
              <Button className="w-full justify-start" variant="outline">
                Clear Cache
              </Button>
              <Button className="w-full justify-start" variant="outline">
                Run Database Maintenance
              </Button>
              <Button className="w-full justify-start text-red-600 hover:text-red-700" variant="outline">
                Emergency Shutdown
              </Button>
            </div>
            <div className="mt-6 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">
                ⚠️ <strong>Warning:</strong> Admin actions are logged and cannot be undone.
                Please exercise caution when performing database operations.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}