"use client";

import { getSupabaseBrowser } from "@/lib/supabase-browser";
import { useEffect, useRef, useState } from "react";

export type RoomRealtimeStatus = "connecting" | "realtime" | "fallback";

export type RoomPresence = {
  hosts: number;
  displays: number;
  players: number;
};

export type RoomSoundTest = {
  playerId: string;
  displayName: string;
  soundType: "builtin" | "custom";
  soundKey: string | null;
  soundUrl: string | null;
};

type PresenceRole = "host" | "display" | "player";

type PresencePayload = {
  role?: PresenceRole;
  id?: string | null;
};

export function useRoomPresence(
  code: string | null,
  role: PresenceRole | null,
  id: string | null,
  onSoundTest?: (payload: RoomSoundTest) => void,
) {
  const [status, setStatus] = useState<RoomRealtimeStatus>("connecting");
  const [presence, setPresence] = useState<RoomPresence>({ hosts: 0, displays: 0, players: 0 });
  const soundTestRef = useRef(onSoundTest);

  useEffect(() => {
    soundTestRef.current = onSoundTest;
  }, [onSoundTest]);

  useEffect(() => {
    if (!code || !role) {
      const clear = window.setTimeout(() => {
        setStatus("connecting");
        setPresence({ hosts: 0, displays: 0, players: 0 });
      }, 0);
      return () => window.clearTimeout(clear);
    }

    const supabase = getSupabaseBrowser();
    if (!supabase) {
      const fallback = window.setTimeout(() => setStatus("fallback"), 0);
      return () => window.clearTimeout(fallback);
    }

    let active = true;
    const presenceKey = `${role}:${id ?? Math.random().toString(36).slice(2)}`;
    const channel = supabase
      .channel(`room-meta:${code}`, { config: { presence: { key: presenceKey } } })
      .on("presence", { event: "sync" }, () => {
        if (!active) return;
        const raw = channel.presenceState() as unknown as Record<string, PresencePayload[]>;
        const next: RoomPresence = { hosts: 0, displays: 0, players: 0 };
        for (const entries of Object.values(raw)) {
          for (const entry of entries) {
            if (entry.role === "host") next.hosts += 1;
            if (entry.role === "display") next.displays += 1;
            if (entry.role === "player") next.players += 1;
          }
        }
        setPresence(next);
      })
      .on("broadcast", { event: "sound_test" }, ({ payload }) => {
        soundTestRef.current?.(payload as RoomSoundTest);
      })
      .subscribe(async (nextStatus) => {
        if (!active) return;
        if (nextStatus === "SUBSCRIBED") {
          setStatus("realtime");
          await channel.track({ role, id });
          return;
        }
        if (nextStatus === "CHANNEL_ERROR" || nextStatus === "TIMED_OUT" || nextStatus === "CLOSED") {
          setStatus("fallback");
        }
      });

    const onOffline = () => setStatus("fallback");
    window.addEventListener("offline", onOffline);

    return () => {
      active = false;
      window.removeEventListener("offline", onOffline);
      void supabase.removeChannel(channel);
    };
  }, [code, id, role]);

  return { status, presence };
}
