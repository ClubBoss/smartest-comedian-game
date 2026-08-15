"use client";

import { QrCode } from "@/components/qr-code";
import { soundLabel } from "@/domain/sounds";
import { useRoomState } from "@/hooks/use-room-state";
import { playWinnerCue } from "@/lib/buzzer-audio";
import { useEffect, useMemo, useRef, useState } from "react";

export function DisplayLobby({ code }: { code: string }) {
  const { state: lobby } = useRoomState(code);
  const [soundArmed, setSoundArmed] = useState(false);
  const lastPlayedCycle = useRef<string | null>(null);

  const joinUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    return `${window.location.origin}/play/${code}`;
  }, [code]);

  useEffect(() => {
    const buzz = lobby?.buzz;
    if (!soundArmed || !buzz?.winnerId || lastPlayedCycle.current === buzz.cycleId) return;
    lastPlayedCycle.current = buzz.cycleId;
    void playWinnerCue(buzz.winnerSoundType, buzz.winnerSoundKey, buzz.winnerSoundUrl).catch(() => undefined);
  }, [lobby?.buzz, soundArmed]);

  if (!lobby) {
    return <main className="display-shell center"><h1>Room {code}</h1><p>Waiting for room...</p></main>;
  }

  return (
    <main className="display-shell stack">
      <header className="display-header">
        <div>
          <p className="eyebrow">Room</p>
          <div className="display-code">{lobby.code}</div>
          <p>{lobby.playerCount} / {lobby.capacity} players</p>
        </div>
        <div className="display-tools">
          {joinUrl ? <QrCode value={joinUrl} size={150} /> : null}
          <button className="sound-arm" onClick={() => setSoundArmed(true)} disabled={soundArmed}>
            {soundArmed ? "Sound enabled" : "Enable sound"}
          </button>
        </div>
      </header>

      <section className={`buzz-stage ${lobby.buzz?.status === "open" ? "open" : lobby.buzz?.winnerId ? "locked" : ""}`}>
        {lobby.buzz?.status === "open" ? (
          <><p>BUZZERS OPEN</p><strong>GO!</strong></>
        ) : lobby.buzz?.winnerName ? (
          <>
            <p>FIRST</p>
            <strong>{lobby.buzz.winnerName}</strong>
            {lobby.buzz.scoreResolved ? (
              <span className="display-answer-score">Answer: {lobby.buzz.scoreDelta! > 0 ? "+" : ""}{lobby.buzz.scoreDelta}</span>
            ) : lobby.buzz.winnerSource === "host" ? <span>Host override</span> : null}
          </>
        ) : (
          <><p>BUZZER</p><strong>WAITING</strong></>
        )}
      </section>

      <section className="display-players" aria-label="Scoreboard">
        {lobby.players.map((player) => (
          <article className={lobby.buzz?.winnerId === player.id ? "display-player active-winner" : "display-player"} key={player.id}>
            <span className="seat">{player.seatOrder}</span>
            <strong className="display-player-name">{player.displayName}</strong>
            <strong className="display-score" aria-label={`${player.displayName} score`}>{player.score}</strong>
            <span className="display-sound">{player.soundType === "custom" ? "Custom sound" : soundLabel(player.soundKey)}</span>
          </article>
        ))}
      </section>
      {lobby.players.length === 0 ? <p className="display-waiting">Scan the QR to join</p> : null}
    </main>
  );
}
