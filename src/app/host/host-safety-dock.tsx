"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

const CURRENT_ROOM_KEY = "smartest-host-current-room";

type SafetyPlayer = {
  id: string;
  displayName: string;
  score: number;
};

type SafetyLobby = {
  code: string;
  players: SafetyPlayer[];
  canUndoScore: boolean;
  buzz: { cycleId: string; status: string; winnerId: string | null } | null;
};

export function HostSafetyDock() {
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [hostToken, setHostToken] = useState<string | null>(null);
  const [lobby, setLobby] = useState<SafetyLobby | null>(null);
  const [lastSuccessAt, setLastSuccessAt] = useState<number | null>(null);
  const [monitorStartedAt, setMonitorStartedAt] = useState(() => Date.now());
  const [now, setNow] = useState(() => Date.now());
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [overridePlayerId, setOverridePlayerId] = useState("");
  const [manualPlayerId, setManualPlayerId] = useState("");
  const [manualDelta, setManualDelta] = useState(1);

  useEffect(() => {
    const syncRoom = () => {
      const nextCode = localStorage.getItem(CURRENT_ROOM_KEY);
      setRoomCode((current) => {
        if (current !== nextCode) {
          setLobby(null);
          setLastSuccessAt(null);
          setMonitorStartedAt(Date.now());
          setError(null);
          setOverridePlayerId("");
          setManualPlayerId("");
        }
        return nextCode;
      });
      setHostToken(nextCode ? localStorage.getItem(`smartest-host-${nextCode}`) : null);
    };
    syncRoom();
    const interval = window.setInterval(syncRoom, 1000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  const refreshState = useCallback(async () => {
    if (!roomCode) return false;
    try {
      const response = await fetch(`/api/rooms/${roomCode}`, { cache: "no-store" });
      if (!response.ok) throw new Error(response.status === 404 ? "Room not found." : `Room refresh failed (${response.status}).`);
      const next = (await response.json()) as SafetyLobby;
      setLobby(next);
      setLastSuccessAt(Date.now());
      setError(null);
      return true;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not reach the room.");
      return false;
    }
  }, [roomCode]);

  useEffect(() => {
    if (!roomCode) return;
    void refreshState();
    const interval = window.setInterval(() => void refreshState(), 5000);
    return () => window.clearInterval(interval);
  }, [refreshState, roomCode]);

  const ageSeconds = Math.max(0, Math.floor((now - (lastSuccessAt ?? monitorStartedAt)) / 1000));
  const stale = Boolean(roomCode) && ageSeconds >= 12;
  const connectionLabel = stale
    ? `STALE · ${ageSeconds}s`
    : lastSuccessAt
      ? `live · ${ageSeconds}s`
      : `checking · ${ageSeconds}s`;

  const sortedPlayers = useMemo(
    () => [...(lobby?.players ?? [])].sort((a, b) => a.displayName.localeCompare(b.displayName)),
    [lobby?.players],
  );

  async function postHost(path: string, body: object = {}) {
    if (!roomCode || !hostToken) {
      setError("Host control token is missing on this browser.");
      return false;
    }
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/rooms/${roomCode}/${path}`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-host-token": hostToken,
        },
        body: JSON.stringify(body),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error ?? `Recovery action failed (${response.status}).`);
      await refreshState();
      window.dispatchEvent(new Event("smartest-live-question-refresh"));
      return true;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Recovery action failed.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  if (!roomCode) return null;

  return (
    <details
      aria-label="Host safety and recovery"
      style={{
        position: "fixed",
        right: 14,
        bottom: 14,
        zIndex: 1000,
        width: "min(390px, calc(100vw - 28px))",
        border: stale ? "2px solid #a51d1d" : "1px solid #555",
        borderRadius: 14,
        background: "#fff",
        boxShadow: "0 8px 28px rgba(0,0,0,.2)",
        overflow: "hidden",
      }}
    >
      <summary
        style={{
          cursor: "pointer",
          padding: "11px 14px",
          background: stale ? "#a51d1d" : "#171717",
          color: "#fff",
          fontWeight: 900,
          listStylePosition: "inside",
        }}
      >
        Safety · {connectionLabel}
      </summary>
      <div style={{ display: "grid", gap: 12, padding: 14 }}>
        <div>
          <strong>Room {roomCode}</strong>
          <p className="muted compact">
            {stale ? "Host data may be old. Pause game actions until refresh succeeds." : "Emergency controls stay available even during Game Mode."}
          </p>
          {error ? <p className="error" style={{ marginTop: 6 }}>{error}</p> : null}
        </div>

        <div className="host-actions">
          <button className="secondary" disabled={busy} onClick={() => void refreshState()}>Refresh state</button>
          <button className="secondary" disabled={busy} onClick={() => window.location.reload()}>Reload host UI</button>
        </div>

        <div style={{ borderTop: "1px solid #e5e5e5", paddingTop: 12, display: "grid", gap: 8 }}>
          <strong>Winner recovery</strong>
          <div className="override-row">
            <select aria-label="Recovery manual winner" value={overridePlayerId} onChange={(event) => setOverridePlayerId(event.target.value)}>
              <option value="">Choose player...</option>
              {sortedPlayers.map((player) => <option key={player.id} value={player.id}>{player.displayName}</option>)}
            </select>
            <button className="secondary" disabled={busy || !lobby?.buzz || !overridePlayerId} onClick={() => void postHost("buzz/override", { playerId: overridePlayerId })}>Set winner</button>
          </div>
        </div>

        <div style={{ borderTop: "1px solid #e5e5e5", paddingTop: 12, display: "grid", gap: 8 }}>
          <div className="split-heading">
            <strong>Score recovery</strong>
            <button className="secondary" disabled={busy || !lobby?.canUndoScore} onClick={() => void postHost("score/undo")}>Undo latest</button>
          </div>
          <select aria-label="Recovery score player" value={manualPlayerId} onChange={(event) => setManualPlayerId(event.target.value)}>
            <option value="">Choose player...</option>
            {sortedPlayers.map((player) => <option key={player.id} value={player.id}>{player.displayName} ({player.score})</option>)}
          </select>
          <div className="host-actions">
            <input aria-label="Recovery score delta" type="number" step="1" value={manualDelta} onChange={(event) => setManualDelta(Number(event.target.value))} style={{ width: "100%", padding: "10px 12px", border: "1px solid #cfcfcf", borderRadius: 10 }} />
            <button className="secondary" disabled={busy || !manualPlayerId || !Number.isInteger(manualDelta)} onClick={() => void postHost("score/manual", { playerId: manualPlayerId, delta: manualDelta, reason: "Emergency recovery" })}>Apply score</button>
          </div>
        </div>

        {!hostToken ? <p className="error">No host token found. Reloading this browser cannot recover authority; reopen a room saved on the original Host browser.</p> : null}
      </div>
    </details>
  );
}
