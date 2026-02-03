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
                "px-4 py-2 text-sm font-medium rounded-full transition-colors whitespace-nowrap",
                isActive
                  ? "bg-primary-200 text-dark-100"
                  : "text-light-100 hover:bg-dark-200"
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