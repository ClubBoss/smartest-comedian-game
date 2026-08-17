"use client";

import { useEffect } from "react";

type WakeLockSentinelLike = {
  release: () => Promise<void>;
  addEventListener?: (type: "release", listener: () => void, options?: AddEventListenerOptions) => void;
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
        const acquired = await wakeLock.request("screen");
        if (!active) {
          void acquired.release().catch(() => undefined);
          return;
        }
        sentinel = acquired;
        acquired.addEventListener?.("release", () => {
          if (sentinel === acquired) sentinel = null;
          if (active && document.visibilityState === "visible") void acquire();
        }, { once: true });
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
      const current = sentinel;
      sentinel = null;
      if (current) void current.release().catch(() => undefined);
    };
  }, [enabled]);

  return null;
}
