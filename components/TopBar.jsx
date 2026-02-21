"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { logout } from "@/lib/actions/auth.action";

export default function TopBar({ user }) {
  const router = useRouter();
  const pathname = usePathname();
  const [loggingOut, setLoggingOut] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const handleLogout = async () => {
    try {
      setLoggingOut(true);
      await logout();
      toast.success("✅ Logged out successfully!");
      setTimeout(() => {
        router.push("/sign-in");
      }, 500);
    } catch (error) {
      toast.error("❌ Failed to logout!");
    } finally {
      setLoggingOut(false);
      setShowDropdown(false);
    }
  };

  const isSettingsPage = pathname === "/settings" || pathname.startsWith("/settings/");

  return (
    <nav className="sticky top-0 z-50 bg-dark-200 border-b border-dark-300 backdrop-blur-md">
      <div className="flex items-center justify-between px-6 py-3 h-16">
        {/* Left Section */}
        <div className="flex items-center gap-2 flex-1">
          <span className="text-lg font-semibold text-primary-200">
            {user?.name || "User"}
          </span>
          <span className="text-light-400 text-sm">•</span>
          <span className="text-light-400 text-sm">{user?.email || "student"}</span>
        </div>

        {/* Right Section - Actions */}
        <div className="flex items-center gap-4">
          {/* Settings Button */}
          <Link
            href="/settings"
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
              isSettingsPage
                ? "bg-primary-200 text-dark-100 font-semibold shadow-lg"
                : "bg-dark-300 text-light-100 hover:bg-dark-300/80 hover:text-primary-200"
            }`}
          >
            <span className="text-lg">⚙️</span>
            <span className="hidden md:inline text-sm font-medium">Settings</span>
          </Link>

          {/* User Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="w-10 h-10 rounded-full bg-primary-200 text-dark-100 font-bold flex items-center justify-center hover:shadow-lg transition-shadow text-lg"
            >
              {user?.name?.charAt(0) || "U"}
            </button>

            {/* Dropdown Menu */}
            {showDropdown && (
              <div className="absolute right-0 mt-2 w-48 rounded-lg bg-dark-300 border border-dark-200 shadow-xl overflow-hidden">
                {/* Profile Info */}
                <div className="px-4 py-3 border-b border-dark-200 bg-dark-200/50">
                  <p className="text-sm font-semibold text-light-100 truncate">
                    {user?.name || "User"}
                  </p>
                  <p className="text-xs text-light-400 truncate">{user?.email}</p>
                </div>

                {/* Menu Items */}
                <Link
                  href="/profile"
                  onClick={() => setShowDropdown(false)}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-light-100 hover:bg-dark-200 transition"
                >
                  <span>👤</span>
                  <span>View Profile</span>
                </Link>

                <Link
                  href="/settings"
                  onClick={() => setShowDropdown(false)}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-light-100 hover:bg-dark-200 transition"
                >
                  <span>⚙️</span>
                  <span>Settings</span>
                </Link>

                {/* Logout */}
                <button
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-400 hover:bg-red-500/20 transition border-t border-dark-200 disabled:opacity-50"
                >
                  <span>🚪</span>
                  <span>{loggingOut ? "Logging out..." : "Logout"}</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
