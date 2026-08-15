"use client";

import type { LobbyState } from "@/domain/lobby";
import { BUILTIN_SOUNDS, soundLabel } from "@/domain/sounds";
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
  const [lobby, setLobby] = useState<LobbyState | null>(null);
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [soundKey, setSoundKey] = useState<string>(BUILTIN_SOUNDS[0].key);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);

  async function loadLobby() {
    const response = await fetch(`/api/rooms/${code}`, { cache: "no-store" });
    if (!response.ok) {
      setLobby(null);
      if (response.status === 404) setError("Room not found.");
      return;
    }
    const next: LobbyState = await response.json();
    setLobby(next);
    setError(null);
    if (!identity && !next.availableSoundKeys.includes(soundKey) && next.availableSoundKeys[0]) {
      setSoundKey(next.availableSoundKeys[0]);
    }
  }

  useEffect(() => {
    void loadLobby();
    const raw = localStorage.getItem(storageKey);
    if (raw) {
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
    }
  }, [code, storageKey]);

  useEffect(() => {
    const timer = window.setInterval(() => void loadLobby(), 1000);
    return () => window.clearInterval(timer);
  });

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
      await loadLobby();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not join room.");
      await loadLobby();
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
      await loadLobby();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not upload sound.");
    } finally {
      setUploading(false);
    }
  }

  if (!lobby) {
    return <main className="stack narrow"><h1>Room {code}</h1><div className="card">{error ?? "Loading room..."}</div></main>;
  }

  if (identity) {
    return (
      <main className="stack narrow player-controller">
        <div>
          <p className="eyebrow">Room {code}</p>
          <h1>{identity.displayName}</h1>
        </div>
        <div className="card stack center">
          <div className="seat-badge">Seat {identity.seatOrder}</div>
          <div className="big-sound">{identity.soundType === "custom" ? "Custom sound" : soundLabel(identity.soundKey)}</div>
          <p className="muted">Your buzzer button activates in the next phase. Your identity and sound survive refresh.</p>
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
          <p className="tiny muted">MP3, WAV, OGG or M4A, up to 1.5 MB. If upload fails, your current sound stays active.</p>
          {error ? <p className="error">{error}</p> : null}
        </div>
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
