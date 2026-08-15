"use client";

import { QrCode } from "@/components/qr-code";
import type { LobbyState } from "@/domain/lobby";
import { soundLabel } from "@/domain/sounds";
import { useCallback, useEffect, useMemo, useState } from "react";

export function DisplayLobby({ code }: { code: string }) {
  const [lobby, setLobby] = useState<LobbyState | null>(null);

  const loadLobby = useCallback(async () => {
    const response = await fetch(`/api/rooms/${code}`, { cache: "no-store" });
    if (response.ok) setLobby(await response.json());
  }, [code]);

  useEffect(() => {
    const initial = window.setTimeout(() => void loadLobby(), 0);
    const timer = window.setInterval(() => void loadLobby(), 1000);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(timer);
    };
  }, [loadLobby]);

  const joinUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    return `${window.location.origin}/play/${code}`;
  }, [code]);

  if (!lobby) {
    return <main className="display-shell center"><h1>Room {code}</h1><p>Waiting for room...</p></main>;
  }

  return (
    <main className="display-shell stack">
      <header className="display-header">
        <div>
          <p className="eyebrow">Join the game</p>
          <div className="display-code">{lobby.code}</div>
          <p>{lobby.playerCount} / {lobby.capacity} players</p>
        </div>
        {joinUrl ? <QrCode value={joinUrl} size={180} /> : null}
      </header>
      <section className="display-players">
        {lobby.players.map((player) => (
          <article className="display-player" key={player.id}>
            <span className="seat">{player.seatOrder}</span>
            <strong>{player.displayName}</strong>
            <span>{player.soundType === "custom" ? "Custom sound" : soundLabel(player.soundKey)}</span>
          </article>
        ))}
      </section>
      {lobby.players.length === 0 ? <p className="display-waiting">Scan the QR to join</p> : null}
    </main>
  );
}
