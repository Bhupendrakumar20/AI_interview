// components/admin/AdminSidebar.jsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  Briefcase,
  GraduationCap,
  Trophy,
  BookOpen,
  Settings,
  FileText,
  BarChart3,
  Shield,
  Database,
  LogOut,
  Menu,
  X,
} from "lucide-react";

// ✅ Date formatting helper (optional if you need later)
const formatDate = (dateString) => {
  if (!dateString) return "N/A";
  try {
    return new Date(dateString).toLocaleDateString();
  } catch (error) {
    return "Invalid Date";
  }
};

const AdminSidebar = ({ user }) => {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  const menuItems = [
    {
      title: "Dashboard",
      href: "/admin",
      icon: LayoutDashboard,
    },
    {
      title: "User Management",
      href: "/admin/users",
      icon: Users,
    },
    {
      title: "Interviews",
      href: "/admin/interviews",
      icon: FileText,
    },
    {
      title: "Internships",
      href: "/admin/internships",
      icon: Briefcase,
    },
    {
      title: "Jobs",
      href: "/admin/jobs",
      icon: Briefcase,
    },
    {
      title: "Competitions",
      href: "/admin/competitions",
      icon: Trophy,
    },
    {
      title: "Mentors",
      href: "/admin/mentors",
      icon: Users,
    },
    {
      title: "Courses",
      href: "/admin/courses",
      icon: GraduationCap,
    },
    {
      title: "Content",
      href: "/admin/content",
      icon: BookOpen,
    },
    {
      title: "Analytics",
      href: "/admin/analytics",
      icon: BarChart3,
    },
    {
      title: "Roles & Permissions",
      href: "/admin/roles",
      icon: Shield,
    },
    {
      title: "Database",
      href: "/admin/database",
      icon: Database,
    },
    {
      title: "Settings",
      href: "/admin/settings",
      icon: Settings,
    },
  ];

  // ✅ Convert stats to plain numbers (replace later with real stats)
  const stats = {
    totalUsers: 1250,
    activeUsers: 850,
    pendingApprovals: 23,
    totalContent: 456,
  };

  return (
    <>
      {/* ✅ Mobile Menu Button */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-primary-200 rounded-lg"
      >
        {collapsed ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* ✅ Sidebar */}
      <aside
        className={cn(
          "fixed lg:static top-0 left-0 h-screen bg-white dark:bg-dark-200 border-r border-gray-200 dark:border-dark-300 transition-all duration-300 z-40",
          collapsed ? "-translate-x-full lg:translate-x-0 lg:w-20" : "w-64"
        )}
      >
        <div className="flex flex-col h-full">
          {/* ✅ Logo */}
          <div className="p-4 border-b border-gray-200 dark:border-dark-300">
            <div className="flex items-center gap-3">
              <div className="bg-primary-200 rounded-lg p-2">
                <Shield className="h-6 w-6 text-dark-100" />
              </div>

              {!collapsed && (
                <div>
                  <h2 className="font-bold text-lg">PrepWise Admin</h2>
                  <p className="text-xs text-gray-500 dark:text-light-400">
                    Super Admin Panel
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* ✅ Admin Info */}
          <div className="p-4 border-b border-gray-200 dark:border-dark-300">
            <div className="flex items-center gap-3">
              <div className="bg-primary-200 rounded-full size-10 flex items-center justify-center">
                <span className="font-bold text-dark-100 text-sm">
                  {user?.name?.charAt(0) || "A"}
                </span>
              </div>

              {!collapsed && (
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{user?.name || "Admin"}</p>
                  <p className="text-xs text-gray-500 dark:text-light-400 truncate">
                    {user?.email || "admin@prepwise.ai"}
                  </p>

                  <span className="inline-block mt-1 px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
                    Super Admin
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* ✅ Navigation */}
          <nav className="flex-1 overflow-y-auto p-2">
            <ul className="space-y-1">
              {menuItems.map((item) => {
                const isActive =
                  pathname === item.href || pathname.startsWith(`${item.href}/`);
                const Icon = item.icon;

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors",
                        isActive
                          ? "bg-primary-200 text-dark-100 font-semibold"
                          : "text-gray-700 dark:text-light-100 hover:bg-gray-100 dark:hover:bg-dark-300"
                      )}
                    >
                      <Icon className="h-5 w-5 flex-shrink-0" />
                      {!collapsed && <span>{item.title}</span>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* ✅ Quick Stats */}
          {!collapsed && (
            <div className="p-4 border-t border-gray-200 dark:border-dark-300">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-light-400">Users</span>
                  <span className="font-semibold">{stats.totalUsers}</span>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-light-400">Active</span>
                  <span className="font-semibold text-green-600">
                    {stats.activeUsers}
                  </span>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-light-400">Pending</span>
                  <span className="font-semibold text-yellow-600">
                    {stats.pendingApprovals}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ✅ Logout Button */}
          <div className="p-4 border-t border-gray-200 dark:border-dark-300">
            <button
              onClick={() => {
                // ✅ Replace with your real logout logic
                window.location.href = "/api/auth/logout";
              }}
              className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              <LogOut className="h-5 w-5" />
              {!collapsed && <span>Logout</span>}
            </button>
          </div>
        </div>
      </aside>

      {/* ✅ Overlay for mobile */}
      {collapsed && (
        <div
          className="fixed inset-0 bg-black/50 lg:hidden z-30"
          onClick={() => setCollapsed(false)}
        />
      )}
    </>
  );
};

export default AdminSidebar;
