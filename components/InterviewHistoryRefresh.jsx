"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function InterviewHistoryRefresh() {
  const router = useRouter();

  useEffect(() => {
    const intervalId = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, 10000);

    return () => clearInterval(intervalId);
  }, [router]);

  return null;
}
