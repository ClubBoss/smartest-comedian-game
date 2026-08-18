"use client";

import { useRoomState } from "@/hooks/use-room-state";
import { useEffect, useState } from "react";
import { TournamentPanel } from "./tournament-panel";
import { TournamentSpecialPanel } from "./tournament-special-panel";

const CURRENT_ROOM_KEY = "smartest-host-current-room";

export function HostTournamentDock() {
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [hostToken, setHostToken] = useState<string | null>(null);
  const { state: lobby, refresh } = useRoomState(roomCode);

  useEffect(() => {
    const sync = () => {
      const code = localStorage.getItem(CURRENT_ROOM_KEY)?.trim().toUpperCase() || null;
      setRoomCode(code);
      setHostToken(code ? localStorage.getItem(`smartest-host-${code}`) : null);
    };
    sync();
    const interval = window.setInterval(sync, 750);
    return () => window.clearInterval(interval);
  }, []);

  if (!lobby || !hostToken) return null;

  return (
    <div className="host-tournament-dock">
      <TournamentPanel lobby={lobby} hostToken={hostToken} onRefresh={refresh} gameMode={false} />
      <TournamentSpecialPanel lobby={lobby} hostToken={hostToken} onRefresh={refresh} />
    </div>
  );
}
