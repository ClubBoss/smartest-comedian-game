"use client";

import { QrCode } from "@/components/qr-code";
import type { LobbyState } from "@/domain/lobby";
import { soundLabel } from "@/domain/sounds";
import { useEffect, useMemo, useState } from "react";

const CURRENT_ROOM_KEY = "smartest-host-current-room";

export function HostLobby() {
  const [capacity, setCapacity] = useState(8);
  const [lobby, setLobby] = useState<LobbyState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  async function loadLobby(code: string) {
    const response = await fetch(`/api/rooms/${code}`, { cache: "no-store" });
    if (!response.ok) {
      if (response.status === 404) localStorage.removeItem(CURRENT_ROOM_KEY);
      return;
    }
    setLobby(await response.json());
  }

  useEffect(() => {
    const savedCode = localStorage.getItem(CURRENT_ROOM_KEY);
    if (savedCode) void loadLobby(savedCode);
  }, []);

  useEffect(() => {
    if (!lobby?.code) return;
    const timer = window.setInterval(() => void loadLobby(lobby.code), 1000);
    return () => window.clearInterval(timer);
  }, [lobby?.code]);

  async function createRoom() {
    setCreating(true);
    setError(null);
    try {
      const response = await fetch("/api/rooms", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ capacity }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not create room.");
      localStorage.setItem(CURRENT_ROOM_KEY, result.code);
      localStorage.setItem(`smartest-host-${result.code}`, result.hostToken);
      await loadLobby(result.code);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not create room.");
    } finally {
      setCreating(false);
    }
  }

  const joinUrl = useMemo(() => {
    if (!lobby || typeof window === "undefined") return "";
    return `${window.location.origin}/play/${lobby.code}`;
  }, [lobby]);

  if (!lobby) {
    return (
      <main className="stack narrow">
        <div>
          <p className="eyebrow">Host console</p>
          <h1>Create a room</h1>
          <p className="muted">Choose any capacity from 2 to 10. You can run the game with fewer players than the maximum.</p>
        </div>
        <div className="card stack">
          <label className="field">
            <span>Maximum players</span>
            <select value={capacity} onChange={(event) => setCapacity(Number(event.target.value))}>
              {Array.from({ length: 9 }, (_, index) => index + 2).map((value) => (
                <option key={value} value={value}>{value}</option>
              ))}
            </select>
          </label>
          <button className="primary" onClick={createRoom} disabled={creating}>
            {creating ? "Creating..." : "Create room"}
          </button>
          {error ? <p className="error">{error}</p> : null}
        </div>
      </main>
    );
  }

  return (
    <main className="stack host-shell">
      <div className="split-heading">
        <div>
          <p className="eyebrow">Lobby</p>
          <h1>Room {lobby.code}</h1>
          <p className="muted">{lobby.playerCount} / {lobby.capacity} players joined</p>
        </div>
        <button className="secondary" onClick={() => {
          localStorage.removeItem(CURRENT_ROOM_KEY);
          setLobby(null);
        }}>New room</button>
      </div>

      <div className="lobby-grid">
        <section className="card stack center">
          {joinUrl ? <QrCode value={joinUrl} /> : null}
          <div className="room-code">{lobby.code}</div>
          <p className="muted compact">Scan the QR or open {joinUrl}</p>
        </section>
        <section className="card stack">
          <h2>Players</h2>
          {lobby.players.length === 0 ? <p className="muted">Waiting for players...</p> : null}
          <div className="player-list">
            {lobby.players.map((player) => (
              <div className="player-row" key={player.id}>
                <span className="seat">{player.seatOrder}</span>
                <strong>{player.displayName}</strong>
                <span className="sound-pill">{player.soundType === "custom" ? "Custom sound" : soundLabel(player.soundKey)}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
