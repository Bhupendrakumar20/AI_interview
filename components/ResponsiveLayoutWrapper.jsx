"use client";

import { useState } from "react";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";

export default function ResponsiveLayoutWrapper({ user, children }) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen w-full relative">
      {/* Sidebar - hidden on mobile unless toggled */}
      <div className={`${mobileSidebarOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0 fixed md:sticky top-0 left-0 h-screen z-50 md:z-40 transition-transform duration-300 ease-in-out shrink-0`}>
        <Sidebar user={user} onCloseMobile={() => setMobileSidebarOpen(false)} />
      </div>

      {/* Mobile Drawer Overlay */}
      {mobileSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 md:hidden transition-opacity duration-300"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-h-screen w-full min-w-0">
        <TopBar user={user} onToggleMobileSidebar={() => setMobileSidebarOpen(!mobileSidebarOpen)} />
        <main className="flex-1 overflow-auto">
          <div className="container mx-auto px-3 sm:px-4 py-6 md:py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
