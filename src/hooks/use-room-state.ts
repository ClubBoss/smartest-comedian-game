"use client";

import type { LobbyState } from "@/domain/lobby";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import { useCallback, useEffect, useState } from "react";

export function useRoomState(code: string | null) {
  const [state, setState] = useState<LobbyState | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!code) return null;
    const response = await fetch(`/api/rooms/${code}`, { cache: "no-store" });
    if (!response.ok) {
      setError(response.status === 404 ? "Room not found." : "Could not load room.");
      return null;
    }
    const next = (await response.json()) as LobbyState;
    setState(next);
    setError(null);
    return next;
  }, [code]);

  useEffect(() => {
    if (!code) {
      const clear = window.setTimeout(() => setState(null), 0);
      return () => window.clearTimeout(clear);
    }

    const initial = window.setTimeout(() => void refresh(), 0);
    const fallback = window.setInterval(() => void refresh(), 5000);
    const supabase = getSupabaseBrowser();
    const channel = supabase
      ?.channel(`room:${code}`)
      .on("broadcast", { event: "state_changed" }, () => void refresh())
      .subscribe();

    return () => {
      window.clearTimeout(initial);
      window.clearInterval(fallback);
      if (supabase && channel) void supabase.removeChannel(channel);
    };
  }, [code, refresh]);

  return { state, error, refresh, setState };
}
