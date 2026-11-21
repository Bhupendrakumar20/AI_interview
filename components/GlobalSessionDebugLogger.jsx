"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

export default function GlobalSessionDebugLogger() {
  const pathname = usePathname();
  const lastLogSignatureRef = useRef("");

  useEffect(() => {
    let active = true;

    const logSessionContext = async () => {
      try {
        const response = await fetch("/api/interview-sessions?debug=true", {
          cache: "no-store",
        });
        if (response.status === 401) return;
        if (!response.ok) {
          throw new Error(`Session context request failed (${response.status})`);
        }
        const context = await response.json();
        if (!active) return;

        const signature = JSON.stringify({
          pathname,
          userId: context.userId,
          activeThreadIds: context.activeThreadIds,
          recentThreadIds: context.recentThreadIds,
        });
        if (signature === lastLogSignatureRef.current) return;
        lastLogSignatureRef.current = signature;

        console.info("[Session debug]", {
          page: pathname,
          user_id: context.userId,
          thread_ids: context.recentThreadIds,
          active_thread_ids: context.activeThreadIds,
        });
      } catch (error) {
        if (active) console.error("Failed to load session debug context:", error);
      }
    };

    logSessionContext();
    const intervalId = setInterval(logSessionContext, 10000);

    return () => {
      active = false;
      clearInterval(intervalId);
    };
  }, [pathname]);

  return null;
}
