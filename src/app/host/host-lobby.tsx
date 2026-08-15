"use client";

import { QrCode } from "@/components/qr-code";
import { soundLabel } from "@/domain/sounds";
import { useRoomState } from "@/hooks/use-room-state";
import { useEffect, useMemo, useState } from "react";

const CURRENT_ROOM_KEY = "smartest-host-current-room";

export function HostLobby() {
  const [capacity, setCapacity] = useState(8);
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [hostToken, setHostToken] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [overridePlayerId, setOverridePlayerId] = useState("");
  const { state: lobby, error, refresh } = useRoomState(roomCode);

  useEffect(() => {
    const initial = window.setTimeout(() => {
      const savedCode = localStorage.getItem(CURRENT_ROOM_KEY);
      if (!savedCode) return;
      setRoomCode(savedCode);
      setHostToken(localStorage.getItem(`smartest-host-${savedCode}`));
    }, 0);
    return () => window.clearTimeout(initial);
  }, []);

  async function createRoom() {
    setCreating(true);
    setActionError(null);
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
      setHostToken(result.hostToken);
      setRoomCode(result.code);
    } catch (caught) {
      setActionError(caught instanceof Error ? caught.message : "Could not create room.");
    } finally {
      setCreating(false);
    }
  }

  async function hostAction(path: string, body?: object) {
    if (!roomCode || !hostToken) {
      setActionError("Host control token is missing. Create a new room on this device.");
      return;
    }
    setActionError(null);
    const response = await fetch(`/api/rooms/${roomCode}/buzz/${path}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-host-token": hostToken,
      },
      body: JSON.stringify(body ?? {}),
    });
    const result = await response.json();
    if (!response.ok) {
      setActionError(result.error ?? "Host action failed.");
      return;
    }
    await refresh();
  }

  const joinUrl = useMemo(() => {
    if (!lobby || typeof window === "undefined") return "";
    return `${window.location.origin}/play/${lobby.code}`;
  }, [lobby]);

  if (!roomCode || !lobby) {
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
          {actionError || error ? <p className="error">{actionError ?? error}</p> : null}
        </div>
      </main>
    );
  }

  const buzzOpen = lobby.buzz?.status === "open";
  const buzzLocked = lobby.buzz?.status === "locked";

  return (
    <main className="stack host-shell">
      <div className="split-heading">
        <div>
          <p className="eyebrow">Host console</p>
          <h1>Room {lobby.code}</h1>
          <p className="muted">{lobby.playerCount} / {lobby.capacity} players joined</p>
        </div>
        <button className="secondary" onClick={() => {
          localStorage.removeItem(CURRENT_ROOM_KEY);
          setRoomCode(null);
          setHostToken(null);
        }}>New room</button>
      </div>

      <section className="card stack host-buzzer-panel">
        <div className="split-heading">
          <div>
            <p className="eyebrow">Buzzer</p>
            <h2>{buzzOpen ? "Open" : buzzLocked ? `${lobby.buzz?.winnerName} buzzed first` : "Ready"}</h2>
          </div>
          <span className={`status-pill ${buzzOpen ? "live" : ""}`}>{buzzOpen ? "LIVE" : lobby.phase}</span>
        </div>
        <div className="host-actions">
          <button
            className="primary"
            disabled={lobby.playerCount < 2 || buzzOpen}
            onClick={() => void hostAction("open")}
          >
            {buzzLocked ? "Open again" : "Open buzzer"}
          </button>
          <button className="secondary" disabled={!buzzOpen} onClick={() => void hostAction("close")}>Close</button>
        </div>
        {lobby.buzz ? (
          <div className="override-row">
            <select value={overridePlayerId} onChange={(event) => setOverridePlayerId(event.target.value)}>
              <option value="">Manual winner...</option>
              {lobby.players.map((player) => <option key={player.id} value={player.id}>{player.displayName}</option>)}
            </select>
            <button className="secondary" disabled={!overridePlayerId} onClick={() => void hostAction("override", { playerId: overridePlayerId })}>Set winner</button>
          </div>
        ) : null}
        {actionError ? <p className="error">{actionError}</p> : null}
      </section>

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
