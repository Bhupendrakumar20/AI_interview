"use client";

import { useEffect } from "react";

const EXIT_CONFIRMATION_MESSAGE =
  "Your session is in progress. Are you sure you want to leave? Your progress may be lost.";

export function useExitConfirmation(enabled) {
  useEffect(() => {
    if (!enabled) return;

    const handleClick = (event) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const target = event.target;
      if (!(target instanceof Element)) return;

      const link = target.closest("a[href]");
      if (!link || (link.target && link.target !== "_self") || link.hasAttribute("download")) {
        return;
      }

      const destination = new URL(link.href, window.location.href);
      if (
        destination.origin !== window.location.origin ||
        destination.pathname === window.location.pathname
      ) {
        return;
      }

      if (!window.confirm(EXIT_CONFIRMATION_MESSAGE)) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    };

    const handleBeforeUnload = (event) => {
      event.preventDefault();
      event.returnValue = "";
    };

    document.addEventListener("click", handleClick, true);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      document.removeEventListener("click", handleClick, true);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [enabled]);
}
