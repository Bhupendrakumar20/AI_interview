// components/DashboardNav.jsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const DashboardNav = ({ items }) => {
  const pathname = usePathname();

  return (
    <div className="flex overflow-x-auto border-b border-dark-200 pb-2">
      <div className="flex space-x-1">
        {items.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "px-4 py-2 text-sm font-semibold rounded-full transition-all whitespace-nowrap",
                isActive
                  ? "bg-indigo-600 dark:bg-indigo-500 text-white shadow-sm shadow-indigo-500/25"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
};

export default DashboardNav;