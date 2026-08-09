"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { io } from "socket.io-client";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";

export default function ResponsiveLayoutWrapper({ user, children }) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const isLocal = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
    const socketUrl = isLocal ? 'http://localhost:4002' : (process.env.NEXT_PUBLIC_SOCKET_IO_URL || 'http://localhost:4002');
    
    console.log(`🔌 Global layout connecting to socket server: ${socketUrl}`);
    const socket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
    });

    socket.on("content-updated", ({ contentType }) => {
      if (contentType === "featured") {
        console.log("🔄 Featured items updated, refreshing page...");
        router.refresh();
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [router]);

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
