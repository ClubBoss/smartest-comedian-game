"use client";

import { QrCode } from "@/components/qr-code";
import { soundLabel } from "@/domain/sounds";
import { useRoomState } from "@/hooks/use-room-state";
import { useEffect, useMemo, useState } from "react";
import { LiveQuestionPanel } from "./live-question-panel";

const CURRENT_ROOM_KEY = "smartest-host-current-room";

export function HostLobby() {
  const [capacity, setCapacity] = useState(8);
  const [roomCode, setRoomCode] = useState<string | null>(null);
  const [hostToken, setHostToken] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [overridePlayerId, setOverridePlayerId] = useState("");
  const [manualPlayerId, setManualPlayerId] = useState("");
  const [manualDelta, setManualDelta] = useState(1);
  const [manualReason, setManualReason] = useState("");
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

  async function postHost(path: string, body?: object) {
    if (!roomCode || !hostToken) {
      setActionError("Host control token is missing. Create a new room on this device.");
      return false;
    }
    setActionError(null);
    const response = await fetch(`/api/rooms/${roomCode}/${path}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-host-token": hostToken,
      },
      body: JSON.stringify(body ?? {}),
    });
    const result = await response.json();
    if (!response.ok) {
      const message = result.error === "ERR_STIMULUS_HIDDEN"
        ? "Show the preloaded question before opening the buzzer."
        : result.error;
      setActionError(message ?? "Host action failed.");
      return false;
    }
    await refresh();
    return true;
  }

  async function scoreAnswer(delta: -1 | 0 | 1) {
    if (!lobby?.buzz?.winnerId) return;
    await postHost("score/answer", {
      playerId: lobby.buzz.winnerId,
      cycleId: lobby.buzz.cycleId,
      delta,
    });
  }

  async function applyManualScore() {
    if (!manualPlayerId || !Number.isInteger(manualDelta)) return;
    const ok = await postHost("score/manual", {
      playerId: manualPlayerId,
      delta: manualDelta,
      reason: manualReason,
    });
    if (ok) setManualReason("");
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
  const winner = lobby.buzz?.winnerId
    ? lobby.players.find((player) => player.id === lobby.buzz?.winnerId) ?? null
    : null;

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

      {hostToken ? <LiveQuestionPanel code={lobby.code} hostToken={hostToken} onRoomRefresh={refresh} /> : null}

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
            onClick={() => void postHost("buzz/open")}
          >
            {buzzLocked ? "Open again" : "Open buzzer"}
          </button>
          <button className="secondary" disabled={!buzzOpen} onClick={() => void postHost("buzz/close")}>Close</button>
        </div>

        {winner ? (
          <div className="score-winner stack">
            <div className="split-heading">
              <div>
                <p className="eyebrow">Answer score</p>
                <h2>{winner.displayName} · {winner.score}</h2>
              </div>
              {lobby.buzz?.scoreResolved ? <span className="status-pill">Recorded {lobby.buzz.scoreDelta! > 0 ? "+" : ""}{lobby.buzz.scoreDelta}</span> : null}
            </div>
            <div className="answer-score-actions">
              {([-1, 0, 1] as const).map((delta) => (
                <button
                  key={delta}
                  className={delta === 1 ? "primary score-button" : "secondary score-button"}
                  disabled={Boolean(lobby.buzz?.scoreResolved)}
                  onClick={() => void scoreAnswer(delta)}
                >
                  {delta > 0 ? "+1" : delta}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {lobby.buzz ? (
          <div className="override-row">
            <select value={overridePlayerId} onChange={(event) => setOverridePlayerId(event.target.value)}>
              <option value="">Manual winner...</option>
              {lobby.players.map((player) => <option key={player.id} value={player.id}>{player.displayName}</option>)}
            </select>
            <button className="secondary" disabled={!overridePlayerId} onClick={() => void postHost("buzz/override", { playerId: overridePlayerId })}>Set winner</button>
          </div>
        ) : null}
        {actionError ? <p className="error">{actionError}</p> : null}
      </section>

      <section className="card stack">
        <div className="split-heading">
          <div>
            <p className="eyebrow">Special scoring</p>
            <h2>Manual adjustment</h2>
          </div>
          <button className="secondary" disabled={!lobby.canUndoScore} onClick={() => void postHost("score/undo")}>Undo latest score</button>
        </div>
        <div className="manual-score-grid">
          <select value={manualPlayerId} onChange={(event) => setManualPlayerId(event.target.value)}>
            <option value="">Choose player...</option>
            {lobby.players.map((player) => <option key={player.id} value={player.id}>{player.displayName} ({player.score})</option>)}
          </select>
          <input aria-label="Manual score delta" type="number" step="1" value={manualDelta} onChange={(event) => setManualDelta(Number(event.target.value))} />
          <input aria-label="Manual score reason" value={manualReason} maxLength={200} onChange={(event) => setManualReason(event.target.value)} placeholder="Reason (optional)" />
          <button className="secondary" disabled={!manualPlayerId || !Number.isInteger(manualDelta)} onClick={() => void applyManualScore()}>Apply</button>
        </div>
      </section>

      <div className="lobby-grid">
        <section className="card stack center">
          {joinUrl ? <QrCode value={joinUrl} /> : null}
          <div className="room-code">{lobby.code}</div>
          <p className="muted compact">Scan the QR or open {joinUrl}</p>
        </section>
        <section className="card stack">
          <h2>Scoreboard</h2>
          {lobby.players.length === 0 ? <p className="muted">Waiting for players...</p> : null}
          <div className="player-list">
            {lobby.players.map((player) => (
              <div className="player-row score-row" key={player.id}>
                <span className="seat">{player.seatOrder}</span>
                <strong>{player.displayName}</strong>
                <strong className="host-score">{player.score}</strong>
                <span className="sound-pill">{player.soundType === "custom" ? "Custom sound" : soundLabel(player.soundKey)}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
