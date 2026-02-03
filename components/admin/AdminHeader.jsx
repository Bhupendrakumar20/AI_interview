// components/admin/AdminHeader.jsx
"use client";

import { useState } from "react";
import { Search, Bell, Settings, User, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

const AdminHeader = ({ user }) => {
  const [notifications] = useState([
    { id: 1, title: "New user registered", time: "5 min ago", unread: true },
    { id: 2, title: "Interview scheduled", time: "1 hour ago", unread: true },
    { id: 3, title: "System update", time: "2 hours ago", unread: false },
  ]);

  const unreadCount = notifications.filter(n => n.unread).length;

  return (
    <header className="sticky top-0 z-30 bg-white dark:bg-dark-200 border-b border-gray-200 dark:border-dark-300">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Search */}
          <div className="flex-1 max-w-xl">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="search"
                placeholder="Search users, content, or settings..."
                className="w-full pl-10 pr-4 py-2 bg-gray-100 dark:bg-dark-300 border border-gray-200 dark:border-dark-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-200"
              />
            </div>
          </div>

          {/* Right Section */}
          <div className="flex items-center gap-4">
            {/* Help */}
            <Button variant="ghost" size="icon">
              <HelpCircle className="h-5 w-5" />
            </Button>

            {/* Notifications */}
            <div className="relative">
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </Button>
            </div>

            {/* Settings */}
            <Button variant="ghost" size="icon">
              <Settings className="h-5 w-5" />
            </Button>

            {/* User Menu */}
            <div className="flex items-center gap-3">
              <div className="text-right hidden md:block">
                <p className="text-sm font-medium">{user?.name}</p>
                <p className="text-xs text-gray-500 dark:text-light-400">Super Admin</p>
              </div>
              <div className="bg-primary-200 rounded-full size-10 flex items-center justify-center">
                <User className="h-5 w-5 text-dark-100" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default AdminHeader;