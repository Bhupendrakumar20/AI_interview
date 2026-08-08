// app/admin/page.jsx
import { getSystemStats } from "@/lib/actions/admin.action";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
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
        <p className="text-red-500 font-semibold">Failed to load system statistics</p>
      </div>
    );
  }

  const statCards = [
    {
      title: "Total Users",
      value: stats.users || 0,
      icon: Users,
      color: "bg-blue-500/10 border-blue-500/20 text-blue-400",
      change: "+12%",
      href: "/admin/users"
    },
    {
      title: "Interviews",
      value: stats.interviews || 0,
      icon: FileText,
      color: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
      change: "+8%",
      href: "/admin/interviews"
    },
    {
      title: "Internships",
      value: stats.internships || 0,
      icon: Briefcase,
      color: "bg-indigo-500/10 border-indigo-500/20 text-indigo-400",
      change: "+15%",
      href: "/admin/internships"
    },
    {
      title: "Jobs",
      value: stats.jobs || 0,
      icon: Briefcase,
      color: "bg-cyan-500/10 border-cyan-500/20 text-cyan-400",
      change: "+5%",
      href: "/admin/jobs"
    },
    {
      title: "Competitions",
      value: stats.competitions || 0,
      icon: Trophy,
      color: "bg-rose-500/10 border-rose-500/20 text-rose-400",
      change: "+20%",
      href: "/admin/competitions"
    },
    {
      title: "Courses",
      value: stats.courses || 0,
      icon: GraduationCap,
      color: "bg-amber-500/10 border-amber-500/20 text-amber-400",
      change: "+10%",
      href: "/admin/courses"
    }
  ];

  const quickActions = [
    {
      title: "Add New User",
      description: "Create a new user account",
      icon: Users,
      href: "/admin/users",
      color: "bg-blue-500/10 border-blue-500/20 text-blue-400"
    },
    {
      title: "Add Internship",
      description: "Create new internship opportunity",
      icon: Briefcase,
      href: "/admin/internships",
      color: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
    },
    {
      title: "Add Course",
      description: "Add new course to platform",
      icon: GraduationCap,
      href: "/admin/courses",
      color: "bg-indigo-500/10 border-indigo-500/20 text-indigo-400"
    },
    {
      title: "Manage Featured",
      description: "Add or remove featured home cards",
      icon: Trophy,
      href: "/admin/featured",
      color: "bg-rose-500/10 border-rose-500/20 text-rose-400"
    },
    {
      title: "View Analytics",
      description: "Detailed platform analytics",
      icon: BarChart3,
      href: "/admin/analytics",
      color: "bg-amber-500/10 border-amber-500/20 text-amber-400"
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Admin Dashboard</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Welcome to PrepWise Admin Control Panel
          </p>
        </div>
        <div className="flex gap-3">
          <Button className="btn-secondary font-bold">
            <Download className="h-4 w-4 mr-2" />
            Export Data
          </Button>
          <Button className="btn-primary font-bold">
            <Upload className="h-4 w-4 mr-2" />
            Import Data
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {statCards.map((stat) => (
          <Card key={stat.title} className="bg-white/50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80 backdrop-blur-sm shadow-sm hover:shadow-cyan-500/5 hover:-translate-y-0.5 transition-all">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                {stat.title}
              </CardTitle>
              <div className={`p-2 rounded-lg border ${stat.color}`}>
                <stat.icon className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-extrabold text-slate-900 dark:text-white">{stat.value}</div>
              <p className="text-xs text-green-500 font-medium">{stat.change} from last month</p>
              <Link href={stat.href}>
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-3 text-xs text-cyan-500 hover:text-cyan-400 p-0 hover:bg-transparent cursor-pointer font-semibold"
                >
                  View Details →
                </Button>
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {quickActions.map((action) => (
          <Link key={action.title} href={action.href} className="block">
            <Card className="bg-white/50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80 backdrop-blur-sm shadow-sm hover:shadow-cyan-500/5 hover:border-cyan-500/30 hover:-translate-y-0.5 transition-all cursor-pointer h-full">
              <CardContent className="p-5 flex items-center justify-between gap-4 h-full">
                <div className="flex items-center gap-4 min-w-0">
                  <div className={`p-3 rounded-xl border ${action.color} shrink-0`}>
                    <action.icon className="h-6 w-6" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100 truncate">{action.title}</h3>
                    <p className="text-xs text-slate-400 mt-1 truncate">{action.description}</p>
                  </div>
                </div>
                <div className="text-cyan-400 text-xs font-bold shrink-0 uppercase tracking-wider flex items-center">
                  Go →
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Recent Activity */}
      <Card className="bg-white/50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80 backdrop-blur-sm shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-bold text-slate-800 dark:text-white">Recent Admin Activity</CardTitle>
            <Button variant="ghost" size="sm" className="text-xs font-semibold text-cyan-500 hover:text-cyan-400 cursor-pointer">
              View All
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3.5">
            {stats.recentActivity?.slice(0, 5).map((log) => (
              <div key={log.id} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-200/50 dark:border-slate-800/50 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg">
                    <Shield className="h-5 w-5 text-cyan-400" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-slate-800 dark:text-slate-200">{log.action.replace(/_/g, ' ')}</p>
                    <p className="text-xs text-slate-400 mt-1">
                      User ID: {log.userId} • {new Date(log.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
                <span className="px-3 py-1 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-semibold rounded-full">
                  {log.adminId}
                </span>
              </div>
            )) || <p className="text-sm text-slate-400 text-center py-4">No recent activity logs.</p>}
          </div>
        </CardContent>
      </Card>

      {/* System Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-white/50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80 backdrop-blur-sm shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-slate-800 dark:text-white">System Status</CardTitle>
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
                    <p className="font-semibold text-sm text-slate-800 dark:text-slate-200">{service.service}</p>
                    <p className="text-xs text-slate-400">Uptime: {service.uptime}</p>
                  </div>
                  <span className={`px-3 py-1 border rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    service.status === 'operational' 
                      ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/30 text-emerald-600 dark:text-emerald-400' 
                      : 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/30 text-amber-600 dark:text-amber-400'
                  }`}>
                    {service.status}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80 backdrop-blur-sm shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-slate-800 dark:text-white">Quick Database Operations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Button className="w-full justify-start text-xs font-semibold cursor-pointer border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800" variant="outline">
                Backup Database
              </Button>
              <Button className="w-full justify-start text-xs font-semibold cursor-pointer border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800" variant="outline">
                Clear Cache
              </Button>
              <Button className="w-full justify-start text-xs font-semibold cursor-pointer border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800" variant="outline">
                Run Database Maintenance
              </Button>
              <Button className="w-full justify-start text-xs font-bold text-rose-500 border-rose-500/20 hover:bg-rose-500/10 cursor-pointer" variant="outline">
                Emergency Shutdown
              </Button>
            </div>
            <div className="mt-6 p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl">
              <p className="text-xs text-rose-400 leading-relaxed">
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