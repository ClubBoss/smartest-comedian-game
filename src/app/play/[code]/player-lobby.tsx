"use client";

import { BUILTIN_SOUNDS, soundLabel } from "@/domain/sounds";
import { useRoomState } from "@/hooks/use-room-state";
import { FormEvent, useEffect, useState } from "react";

type Identity = {
  playerId: string;
  displayName: string;
  seatOrder: number;
  soundType: "builtin" | "custom";
  soundKey: string | null;
  reconnectToken: string;
};

export function PlayerLobby({ code }: { code: string }) {
  const storageKey = `smartest-player-${code}`;
  const { state: lobby, error: roomError, refresh } = useRoomState(code);
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [soundKey, setSoundKey] = useState<string>(BUILTIN_SOUNDS[0].key);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [buzzing, setBuzzing] = useState(false);

  useEffect(() => {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return;
    try {
      const saved = JSON.parse(raw) as Identity;
      fetch(`/api/rooms/${code}/reconnect`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(saved),
      }).then(async (response) => {
        if (response.ok) setIdentity(await response.json());
        else localStorage.removeItem(storageKey);
      });
    } catch {
      localStorage.removeItem(storageKey);
    }
  }, [code, storageKey]);

  async function join(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/rooms/${code}/join`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ displayName, soundKey }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not join room.");
      setIdentity(result);
      localStorage.setItem(storageKey, JSON.stringify(result));
      await refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not join room.");
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function uploadSound(file: File) {
    if (!identity) return;
    setUploading(true);
    setError(null);
    const form = new FormData();
    form.append("sound", file);
    try {
      const response = await fetch(`/api/rooms/${code}/players/${identity.playerId}/sound`, {
        method: "POST",
        headers: { "x-player-token": identity.reconnectToken },
        body: form,
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not upload sound.");
      const updated = { ...identity, soundType: "custom" as const, soundKey: null };
      setIdentity(updated);
      localStorage.setItem(storageKey, JSON.stringify(updated));
      await refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not upload sound.");
    } finally {
      setUploading(false);
    }
  }

  async function buzz() {
    if (!identity || !lobby?.buzz || lobby.buzz.status !== "open") return;
    setBuzzing(true);
    setError(null);
    try {
      const response = await fetch(`/api/rooms/${code}/buzz/claim`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-player-token": identity.reconnectToken,
        },
        body: JSON.stringify({ playerId: identity.playerId, cycleId: lobby.buzz.cycleId }),
      });
      const result = await response.json();
      if (!response.ok && response.status !== 409) throw new Error(result.error ?? "Could not submit buzz.");
      await refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not submit buzz.");
    } finally {
      setBuzzing(false);
    }
  }

  if (!lobby) {
    return <main className="stack narrow"><h1>Room {code}</h1><div className="card">{error ?? roomError ?? "Loading room..."}</div></main>;
  }

  if (identity) {
    const buzzOpen = lobby.buzz?.status === "open";
    const isWinner = lobby.buzz?.winnerId === identity.playerId;
    const currentPlayer = lobby.players.find((player) => player.id === identity.playerId);
    const score = currentPlayer?.score ?? 0;
    return (
      <main className="stack narrow player-controller">
        <div className="split-heading">
          <div>
            <p className="eyebrow">Room {code}</p>
            <h1>{identity.displayName}</h1>
          </div>
          <div className="player-score-badge"><span>Score</span><strong>{score}</strong></div>
        </div>
        <section className="card stack center">
          <button
            className={`buzzer-button ${buzzOpen ? "ready" : isWinner ? "winner" : ""}`}
            disabled={!buzzOpen || buzzing}
            onClick={() => void buzz()}
          >
            {buzzOpen ? (buzzing ? "SENDING..." : "BUZZ") : isWinner ? "FIRST!" : lobby.buzz?.winnerName ? `${lobby.buzz.winnerName} BUZZED` : "WAIT"}
          </button>
          {isWinner && lobby.buzz?.scoreResolved ? (
            <p className="score-result">Answer score: {lobby.buzz.scoreDelta! > 0 ? "+" : ""}{lobby.buzz.scoreDelta}</p>
          ) : null}
          <p className="muted compact">Each new buzzer cycle makes everyone eligible again, including the previous respondent.</p>
        </section>
        <section className="card stack center">
          <div className="seat-badge">Seat {identity.seatOrder}</div>
          <div className="big-sound">{identity.soundType === "custom" ? "Custom sound" : soundLabel(identity.soundKey)}</div>
          <label className="upload-button">
            {uploading ? "Uploading..." : "Upload custom sound"}
            <input
              type="file"
              accept="audio/mpeg,audio/wav,audio/ogg,audio/mp4"
              disabled={uploading}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void uploadSound(file);
              }}
            />
          </label>
          <p className="tiny muted">MP3, WAV, OGG or M4A, up to 1.5 MB. Failed uploads leave your current sound unchanged.</p>
          {error ? <p className="error">{error}</p> : null}
        </section>
      </main>
    );
  }

  return (
    <main className="stack narrow">
      <div>
        <p className="eyebrow">Room {code}</p>
        <h1>Join the game</h1>
        <p className="muted">{lobby.playerCount} / {lobby.capacity} players joined</p>
      </div>
      <form className="card stack" onSubmit={join}>
        <label className="field">
          <span>Your name</span>
          <input value={displayName} maxLength={40} onChange={(event) => setDisplayName(event.target.value)} placeholder="Name" autoComplete="off" />
        </label>
        <div className="field">
          <span>Your buzzer sound</span>
          <div className="sound-grid">
            {BUILTIN_SOUNDS.map((sound) => {
              const available = lobby.availableSoundKeys.includes(sound.key);
              return (
                <button
                  type="button"
                  key={sound.key}
                  disabled={!available}
                  className={soundKey === sound.key ? "sound-choice selected" : "sound-choice"}
                  onClick={() => setSoundKey(sound.key)}
                >
                  {sound.label}
                </button>
              );
            })}
          </div>
        </div>
        <button className="primary" disabled={busy || !displayName.trim() || !lobby.availableSoundKeys.includes(soundKey)}>
          {busy ? "Joining..." : "Join room"}
        </button>
        {error ? <p className="error">{error}</p> : null}
      </form>
    </main>
  );
}
