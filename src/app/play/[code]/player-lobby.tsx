"use client";

import { BUILTIN_SOUNDS, soundEmoji, soundLabel } from "@/domain/sounds";
import { useRoomPresence } from "@/hooks/use-room-presence";
import { useRoomState } from "@/hooks/use-room-state";
import { playBuiltInCue } from "@/lib/buzzer-audio-natural";
import { FormEvent, useEffect, useState } from "react";

type Identity = {
  playerId: string;
  displayName: string;
  seatOrder: number;
  soundType: "builtin" | "custom";
  soundKey: string | null;
  reconnectToken: string;
};

type WakeLockSentinelLike = {
  release: () => Promise<void>;
};

type WakeLockNavigator = Navigator & {
  wakeLock?: {
    request: (type: "screen") => Promise<WakeLockSentinelLike>;
  };
};

export function PlayerLobby({ code }: { code: string }) {
  const storageKey = `smartest-player-${code}`;
  const { state: lobby, error: roomError, refresh } = useRoomState(code);
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [soundKey, setSoundKey] = useState<string>(BUILTIN_SOUNDS[0].key);
  const [previewingSound, setPreviewingSound] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [buzzing, setBuzzing] = useState(false);
  const [readyBusy, setReadyBusy] = useState(false);
  const [soundTesting, setSoundTesting] = useState(false);
  const { status: realtimeStatus } = useRoomPresence(code, identity ? "player" : null, identity?.playerId ?? null);

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

  useEffect(() => {
    if (!identity) return;
    const wakeLock = (navigator as WakeLockNavigator).wakeLock;
    if (!wakeLock) return;
    let sentinel: WakeLockSentinelLike | null = null;
    let active = true;

    const acquire = async () => {
      if (!active || document.visibilityState !== "visible" || sentinel) return;
      try {
        sentinel = await wakeLock.request("screen");
      } catch {
        sentinel = null;
      }
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") void acquire();
    };
    void acquire();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      active = false;
      document.removeEventListener("visibilitychange", onVisibility);
      if (sentinel) void sentinel.release().catch(() => undefined);
    };
  }, [identity]);

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

  async function previewSound(key: string) {
    setSoundKey(key);
    setPreviewingSound(key);
    try {
      await playBuiltInCue(key);
    } catch {
      // Preview failure should never block choosing or joining with a sound.
    }
    window.setTimeout(() => {
      setPreviewingSound((current) => current === key ? null : current);
    }, 750);
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

  async function setReady(ready: boolean) {
    if (!identity) return;
    setReadyBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/rooms/${code}/players/${identity.playerId}/ready`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-player-token": identity.reconnectToken,
        },
        body: JSON.stringify({ ready }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not update ready state.");
      await refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not update ready state.");
    } finally {
      setReadyBusy(false);
    }
  }

  async function testSound() {
    if (!identity) return;
    setSoundTesting(true);
    setError(null);
    try {
      const response = await fetch(`/api/rooms/${code}/players/${identity.playerId}/sound-test`, {
        method: "POST",
        headers: { "x-player-token": identity.reconnectToken },
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not send sound test.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not send sound test.");
    } finally {
      setSoundTesting(false);
    }
  }

  async function buzz() {
    if (!identity || !lobby?.buzz || lobby.buzz.status !== "open") return;
    if (lobby.tournament && !lobby.tournament.activePlayerIds.includes(identity.playerId)) return;
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
      if (!response.ok && result.error) setError(result.error);
      navigator.vibrate?.(response.ok ? [35, 25, 70] : 30);
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
    const tournament = lobby.tournament;
    const currentStageMember = tournament && tournament.currentStage !== "complete"
      ? tournament.members.find((member) => member.playerId === identity.playerId && member.stage === tournament.currentStage) ?? null
      : null;
    const qualifierMember = tournament?.members.find(
      (member) => member.playerId === identity.playerId && (member.stage === "qualifier_a" || member.stage === "qualifier_b"),
    ) ?? null;
    const isTournamentActive = !tournament || Boolean(currentStageMember);
    const buzzOpen = lobby.buzz?.status === "open" && isTournamentActive;
    const isWinner = lobby.buzz?.winnerId === identity.playerId;
    const currentPlayer = lobby.players.find((player) => player.id === identity.playerId);
    const score = currentStageMember?.score ?? qualifierMember?.score ?? currentPlayer?.score ?? 0;
    const isReady = currentPlayer?.isReady ?? false;

    let tournamentStatus: string | null = null;
    if (tournament && !isTournamentActive) {
      if (tournament.currentStage === "qualifier_a" && tournament.members.some((member) => member.playerId === identity.playerId && member.stage === "qualifier_b")) {
        tournamentStatus = "QUALIFIER B · YOU'RE UP NEXT";
      } else if (tournament.currentStage === "qualifier_b" && qualifierMember?.qualified) {
        tournamentStatus = "QUALIFIED · WAIT FOR FINAL FOUR";
      } else if (tournament.currentStage === "final") {
        tournamentStatus = "SPECTATING · FINAL FOUR";
      } else {
        tournamentStatus = "SPECTATING · CURRENT QUALIFIER";
      }
    }

    return (
      <main className="stack narrow player-controller">
        <div className="split-heading">
          <div>
            <p className="eyebrow">Room {code}</p>
            <h1>{identity.displayName}</h1>
            <span className={`status-pill ${realtimeStatus === "realtime" ? "live" : ""}`}>
              {realtimeStatus === "realtime" ? "Connected" : realtimeStatus === "fallback" ? "Reconnecting" : "Connecting"}
            </span>
          </div>
          <div className="player-score-badge"><span>{tournament ? "Stage score" : "Score"}</span><strong>{score}</strong></div>
        </div>

        {tournament ? (
          <section className={`tournament-player-banner ${isTournamentActive ? "active" : "spectator"}`} aria-live="polite">
            <span>{tournament.currentStage === "qualifier_a" ? "QUALIFIER A" : tournament.currentStage === "qualifier_b" ? "QUALIFIER B" : tournament.currentStage === "final" ? "FINAL FOUR" : "TOURNAMENT COMPLETE"}</span>
            <strong>{isTournamentActive ? "YOU ARE PLAYING" : tournamentStatus}</strong>
          </section>
        ) : null}

        <section className="card stack center">
          <button
            className={`buzzer-button ${buzzOpen ? "ready" : isWinner ? "winner" : ""}`}
            disabled={!buzzOpen || buzzing || !isTournamentActive}
            onClick={() => void buzz()}
          >
            {!isTournamentActive
              ? "WATCHING"
              : buzzOpen
                ? (buzzing ? "SENDING..." : "BUZZ")
                : isWinner
                  ? "FIRST!"
                  : lobby.buzz?.winnerName
                    ? `${lobby.buzz.winnerName} BUZZED`
                    : "WAIT"}
          </button>
          {isWinner && lobby.buzz?.scoreResolved ? (
            <p className="score-result">Answer score: {lobby.buzz.scoreDelta! > 0 ? "+" : ""}{lobby.buzz.scoreDelta}</p>
          ) : null}
          {!isTournamentActive ? <p className="muted compact">Your buzzer is locked server-side until your tournament stage becomes active.</p> : null}
          <p className="muted compact">Screen stays awake while this controller is open when your browser supports Wake Lock.</p>
        </section>
        <section className="card stack center">
          <div className="seat-badge">Seat {identity.seatOrder}</div>
          <div className="big-sound">{identity.soundType === "custom" ? "🎵 Custom sound" : `${soundEmoji(identity.soundKey)} ${soundLabel(identity.soundKey)}`}</div>
          <div className="host-actions">
            <button className={isReady ? "primary" : "secondary"} disabled={readyBusy} onClick={() => void setReady(!isReady)}>
              {readyBusy ? "Saving..." : isReady ? "✓ Ready" : "I'm ready"}
            </button>
            <button className="secondary" disabled={soundTesting} onClick={() => void testSound()}>
              {soundTesting ? "Sending..." : "Test sound on TV"}
            </button>
          </div>
          <label className="upload-button">
            {uploading ? "Uploading..." : "Upload custom sound"}
            <input
              type="file"
              accept="audio/*,audio/m4a,audio/x-m4a,.m4a,.mp3,.wav,.ogg"
              disabled={uploading}
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void uploadSound(file);
              }}
            />
          </label>
          <p className="tiny muted">MP3, WAV, OGG or M4A / iPhone Voice Memo, up to 1.5 MB. Failed uploads leave your current sound unchanged.</p>
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
                  aria-label={`${sound.label}${available ? " — tap to preview" : " — already taken"}`}
                  className={soundKey === sound.key ? "sound-choice selected" : "sound-choice"}
                  onClick={() => void previewSound(sound.key)}
                >
                  <span className="sound-choice-emoji" aria-hidden="true">{sound.emoji}</span>
                  <span className="sound-choice-copy">
                    <strong>{sound.label}</strong>
                    <small>{available ? previewingSound === sound.key ? "Playing…" : "Tap to preview" : "Taken"}</small>
                  </span>
                </button>
              );
            })}
          </div>
          <p className="tiny muted">Built-in sounds play locally on your device for preview and use no uploaded audio quota.</p>
        </div>
        <button className="primary" disabled={busy || !displayName.trim() || !lobby.availableSoundKeys.includes(soundKey)}>
          {busy ? "Joining..." : "Join room"}
        </button>
        {error ? <p className="error">{error}</p> : null}
      </form>
    </main>
  );
}
