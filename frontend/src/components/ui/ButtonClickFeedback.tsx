"use client";

import { useEffect } from "react";

const SPINNER_TIMEOUT_MS = 1200;

export function ButtonClickFeedback() {
  useEffect(() => {
    const activeTimers = new WeakMap<HTMLButtonElement, number>();

    const clearSpinner = (button: HTMLButtonElement) => {
      const timerId = activeTimers.get(button);
      if (timerId) {
        window.clearTimeout(timerId);
      }
      activeTimers.delete(button);
      button.removeAttribute("data-click-loading");
    };

    const onClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;

      const button = target.closest("button") as HTMLButtonElement | null;
      if (!button) return;
      if (button.disabled) return;
      if (button.hasAttribute("data-no-click-spinner")) return;

      button.setAttribute("data-click-loading", "true");

      const previousTimer = activeTimers.get(button);
      if (previousTimer) {
        window.clearTimeout(previousTimer);
      }

      const timerId = window.setTimeout(() => {
        clearSpinner(button);
      }, SPINNER_TIMEOUT_MS);

      activeTimers.set(button, timerId);
    };

    document.addEventListener("click", onClick, true);

    return () => {
      document.removeEventListener("click", onClick, true);
    };
  }, []);

  return null;
}

