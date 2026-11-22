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
import { logout } from "@/lib/actions/auth.action";

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
  const [skewState, setSkewState] = useState(null);
  const pathname = usePathname();

  const triggerSkewAnimation = (direction) => {
    setSkewState(direction);
    setTimeout(() => {
      setSkewState(null);
    }, 400);
  };

  const handleAdminNavClick = () => {
    // Only auto-collapse on mobile for admin panel
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      setCollapsed(true);
    }
  };

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

  return (
    <>
      {/* ✅ Mobile Menu Button */}
      <button
        onClick={() => {
          const next = !collapsed;
          triggerSkewAnimation(next ? "collapsing" : "expanding");
          setCollapsed(next);
        }}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-primary-200 rounded-lg cursor-pointer speed-skew-nav-item"
        aria-label="Toggle Navigation"
      >
        {collapsed ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* ✅ Sidebar */}
      <aside
        className={cn(
          "fixed lg:static top-0 left-0 h-screen bg-slate-900/90 dark:bg-slate-950/70 backdrop-blur-md border-r border-slate-200 dark:border-slate-800/80 transition-all duration-300 z-40 origin-left",
          collapsed ? "-translate-x-full lg:translate-x-0 lg:w-20" : "w-64",
          skewState === "collapsing" && "animate-speed-skew-collapse",
          skewState === "expanding" && "animate-speed-skew-expand"
        )}
        style={{
          transitionTimingFunction: "cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        <div className="flex flex-col h-full">
          {/* ✅ Logo */}
          <div className="p-4 border-b border-slate-200 dark:border-slate-800/80">
            <Link
              href="/admin"
              onClick={handleAdminNavClick}
              className="flex items-center gap-2.5 speed-skew-nav-item py-1 px-1 rounded-lg group"
            >
              <div className="bg-slate-800/40 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 rounded-lg p-1.5 flex items-center justify-center transition-transform duration-200 group-hover:scale-110 group-hover:-rotate-3">
                <img src="/logo_icon.png" alt="PrepWise" className="h-6 w-6 object-contain shrink-0" />
              </div>

              {!collapsed && (
                <div>
                  <h2 className="font-bold text-lg text-slate-800 dark:text-white group-hover:text-cyan-400 transition-colors">PrepWise Admin</h2>
                  <p className="text-xs text-slate-400">
                    Super Admin Panel
                  </p>
                </div>
              )}
            </Link>
          </div>

          {/* ✅ Admin Info */}
          <div className="p-4 border-b border-slate-200 dark:border-slate-800/80">
            <div className="flex items-center gap-3">
              <div className="bg-cyan-500/10 border border-cyan-500/20 rounded-full size-10 flex items-center justify-center">
                <span className="font-bold text-cyan-400 text-sm uppercase">
                  {user?.name?.charAt(0) || "A"}
                </span>
              </div>

              {!collapsed && (
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate text-slate-800 dark:text-slate-200">{user?.name || "Admin"}</p>
                  <p className="text-xs text-slate-400 truncate">
                    {user?.email || "admin@prepwise.ai"}
                  </p>

                  <span className="inline-block mt-1 px-2.5 py-0.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold rounded-full">
                    Super Admin
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* ✅ Navigation */}
          <nav className="flex-1 overflow-y-auto p-2">
            <ul className="space-y-1">
              {menuItems.map((item, idx) => {
                const isActive =
                  pathname === item.href || pathname.startsWith(`${item.href}/`);
                const Icon = item.icon;

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={handleAdminNavClick}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium speed-skew-nav-item cursor-pointer",
                        isActive
                          ? "bg-gradient-to-r from-cyan-500/15 to-transparent border-l-4 border-cyan-500 text-cyan-500 dark:text-cyan-400 font-semibold"
                          : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900/60 hover:text-slate-800 dark:hover:text-slate-200",
                        skewState === "collapsing" && "animate-item-speed-skew-collapse",
                        skewState === "expanding" && "animate-item-speed-skew-expand"
                      )}
                      style={{
                        animationDelay: skewState ? `${idx * 16}ms` : undefined,
                      }}
                    >
                      <Icon className="h-5 w-5 flex-shrink-0 transition-transform duration-200 hover:scale-110" />
                      {!collapsed && <span>{item.title}</span>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* ✅ Logout Button */}
          <div className="p-4 border-t border-slate-200 dark:border-slate-800/80">
            <button
              onClick={async () => {
                await logout();
                window.location.href = "/";
              }}
              className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-rose-500 hover:bg-rose-500/10 transition-colors font-semibold speed-skew-nav-item cursor-pointer"
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
