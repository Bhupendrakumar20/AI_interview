"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Bell, User, LogOut, Settings } from "lucide-react";
import { logout } from "@/lib/actions/auth.action";
import { db } from "@/firebase/client";
import { collection, query, where, getDocs } from "firebase/firestore";
import ThemeToggle from "@/components/ThemeToggle";

export default function TopBar({ user }) {
  const router = useRouter();
  const pathname = usePathname();
  const [loggingOut, setLoggingOut] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState(0);

  /**
   * Fetch pending approvals count from Firestore
   * This ensures consistency across devices
   */
  const fetchPendingApprovalsFromFirestore = async () => {
    if (!user?.uid) {
      console.log('[TopBar] No user UID available');
      return;
    }

    try {
      console.log(`[TopBar] Fetching pending approvals for user: ${user.uid}`);
      
      // Query all DSA rooms where user is the owner
      const roomsRef = collection(db, 'dsa_rooms');
      const q = query(roomsRef, where('owner', '==', user.uid));
      const roomsSnapshot = await getDocs(q);

      console.log(`[TopBar] Found ${roomsSnapshot.docs.length} rooms owned by user`);

      let totalPendingCount = 0;

      // Check each room for pending requests
      for (const roomDoc of roomsSnapshot.docs) {
        const roomData = roomDoc.data();
        const pendingRequests = roomData.pendingRequests || [];
        console.log(`[TopBar] Room ${roomDoc.id}: ${pendingRequests.length} pending requests`);
        totalPendingCount += pendingRequests.length;
      }

      console.log(`[TopBar] Total pending count: ${totalPendingCount}`);

      if (totalPendingCount > 0) {
        setPendingApprovalsCount(totalPendingCount);
        localStorage.setItem('dsaPendingCount', totalPendingCount.toString());
      } else {
        setPendingApprovalsCount(0);
        localStorage.removeItem('dsaPendingCount');
      }

      console.log(`✅ [TopBar] Updated pending approvals count: ${totalPendingCount}`);
    } catch (error) {
      console.error('[TopBar] Error fetching pending approvals:', error);
      // Fall back to localStorage if Firestore fails
      const stored = localStorage.getItem('dsaPendingCount');
      if (stored) {
        setPendingApprovalsCount(parseInt(stored));
        console.log(`[TopBar] Using localStorage fallback: ${stored}`);
      }
    }
  };

  // Fetch pending approvals on mount and when user changes
  useEffect(() => {
    if (user?.uid) {
      fetchPendingApprovalsFromFirestore();
    }
  }, [user?.uid]);

  // Listen for real-time updates from localStorage
  useEffect(() => {
    const checkPendingApprovals = () => {
      const stored = localStorage.getItem('dsaPendingCount');
      if (stored) {
        setPendingApprovalsCount(parseInt(stored));
      } else {
        setPendingApprovalsCount(0);
      }
    };

    window.addEventListener('storage', checkPendingApprovals);
    // Refresh from Firestore every 10 seconds for accuracy
    const interval = setInterval(() => {
      if (user?.uid) {
        fetchPendingApprovalsFromFirestore();
      }
    }, 10000);

    return () => {
      window.removeEventListener('storage', checkPendingApprovals);
      clearInterval(interval);
    };
  }, [user?.uid]);

  const handleLogout = async () => {
    try {
      setLoggingOut(true);
      await logout();
      toast.success("Logged out successfully");
      setTimeout(() => {
        router.push("/sign-in");
      }, 500);
    } catch (error) {
      toast.error("Failed to logout");
    } finally {
      setLoggingOut(false);
      setShowDropdown(false);
    }
  };

  const isSettingsPage = pathname === "/settings" || pathname.startsWith("/settings/");

  return (
    <nav className="sticky top-0 z-50 bg-card border-b border-border backdrop-blur-md">
      <div className="flex items-center justify-between px-6 py-3 h-16">
        {/* Left Section */}
        <div className="flex-1" />

        {/* Right Section - Actions */}
        <div className="flex items-center gap-4">
          {/* Theme Toggle */}
          <ThemeToggle />
          
          {/* DSA Room Notifications Badge */}
          {pendingApprovalsCount > 0 && (
            <Link
              href="/interview/buddy"
              className="relative flex items-center justify-center w-10 h-10 rounded-lg bg-orange-500/20 text-orange-400 hover:bg-orange-500/30 transition-all hover:shadow-lg hover:shadow-orange-500/20 cursor-pointer"
              title="Pending Interview Buddy DSA approvals"
            >
              <Bell size={20} className="text-orange-400" />
              <span className="absolute top-0 right-0 w-5 h-5 rounded-full bg-orange-500 text-white text-xs font-bold flex items-center justify-center transform translate-x-1 -translate-y-1">
                {pendingApprovalsCount > 9 ? '9+' : pendingApprovalsCount}
              </span>
            </Link>
          )}

          {/* Settings Button */}
          <Link
            href="/settings"
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all cursor-pointer ${
              isSettingsPage
                ? "bg-primary text-primary-foreground font-semibold shadow-lg"
                : "bg-secondary text-foreground hover:bg-secondary/80 hover:text-primary"
            }`}
          >
            <Settings size={18} />
            <span className="hidden md:inline text-sm font-medium">Settings</span>
          </Link>

          {/* User Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="w-10 h-10 rounded-full bg-primary text-primary-foreground font-bold flex items-center justify-center hover:shadow-lg transition-shadow text-lg cursor-pointer"
            >
              {user?.name?.charAt(0) || "U"}
            </button>

            {/* Dropdown Menu */}
            {showDropdown && (
              <div className="absolute right-0 mt-2 w-48 rounded-lg bg-card border border-border shadow-xl overflow-hidden z-50">
                {/* Profile Info */}
                <div className="px-4 py-3 border-b border-border bg-secondary/50">
                  <p className="text-sm font-semibold text-foreground truncate">
                    {user?.name || "User"}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                </div>

                {/* Menu Items */}
                <Link
                  href="/profile"
                  onClick={() => setShowDropdown(false)}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-foreground hover:bg-secondary transition cursor-pointer"
                >
                  <User size={18} />
                  <span>View Profile</span>
                </Link>

                <Link
                  href="/settings"
                  onClick={() => setShowDropdown(false)}
                  className="flex items-center gap-2 px-4 py-2 text-sm text-foreground hover:bg-secondary transition cursor-pointer"
                >
                  <Settings size={18} />
                  <span>Settings</span>
                </Link>

                {/* Logout */}
                <button
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-500 hover:bg-red-500/10 transition border-t border-border disabled:opacity-50 cursor-pointer"
                >
                  <LogOut size={18} />
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
