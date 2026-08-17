"use client";

import { useEffect } from "react";

type WakeLockSentinelLike = {
  release: () => Promise<void>;
};

type WakeLockNavigator = Navigator & {
  wakeLock?: {
    request: (type: "screen") => Promise<WakeLockSentinelLike>;
  };
};

export function ScreenWakeLock({ enabled = true }: { enabled?: boolean }) {
  useEffect(() => {
    if (!enabled) return;
    const wakeLock = (navigator as WakeLockNavigator).wakeLock;
    if (!wakeLock) return;

    let sentinel: WakeLockSentinelLike | null = null;
    let active = true;

    const acquire = async () => {
      if (!active || document.visibilityState !== "visible" || sentinel) return;
      try {
        sentinel = await wakeLock.request("screen");
      } catch {
        sentinel = null;
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") void acquire();
    };

    void acquire();
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      active = false;
      document.removeEventListener("visibilitychange", onVisibility);
      if (sentinel) void sentinel.release().catch(() => undefined);
    };
  }, [enabled]);

  return null;
}
