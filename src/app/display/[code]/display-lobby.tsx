"use client";

import { QrCode } from "@/components/qr-code";
import { soundLabel } from "@/domain/sounds";
import { useRoomPresence, type RoomSoundTest } from "@/hooks/use-room-presence";
import { useRoomState } from "@/hooks/use-room-state";
import { armBuzzerAudio, playWinnerCue } from "@/lib/buzzer-audio";
import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export function DisplayLobby({ code }: { code: string }) {
  const { state: lobby } = useRoomState(code);
  const [soundArmed, setSoundArmed] = useState(false);
  const [soundError, setSoundError] = useState<string | null>(null);
  const [soundTestName, setSoundTestName] = useState<string | null>(null);
  const lastPlayedCycle = useRef<string | null>(null);
  const soundTestTimer = useRef<number | null>(null);

  const handleSoundTest = useCallback((payload: RoomSoundTest) => {
    setSoundTestName(payload.displayName);
    if (soundTestTimer.current) window.clearTimeout(soundTestTimer.current);
    soundTestTimer.current = window.setTimeout(() => setSoundTestName(null), 2500);
    if (soundArmed) {
      void playWinnerCue(payload.soundType, payload.soundKey, payload.soundUrl).catch(() => undefined);
    }
  }, [soundArmed]);

  const { status: realtimeStatus } = useRoomPresence(code, "display", "shared-display", handleSoundTest, { soundArmed });

  const joinUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    return `${window.location.origin}/play/${code}`;
  }, [code]);

  useEffect(() => () => {
    if (soundTestTimer.current) window.clearTimeout(soundTestTimer.current);
  }, []);

  useEffect(() => {
    const buzz = lobby?.buzz;
    if (!soundArmed || !buzz?.winnerId || lastPlayedCycle.current === buzz.cycleId) return;
    lastPlayedCycle.current = buzz.cycleId;
    void playWinnerCue(buzz.winnerSoundType, buzz.winnerSoundKey, buzz.winnerSoundUrl).catch(() => undefined);
  }, [lobby?.buzz, soundArmed]);

  async function enableSound() {
    setSoundError(null);
    const armed = await armBuzzerAudio();
    if (!armed) {
      setSoundError("This browser blocked game audio. Check the TV browser sound permissions and try again.");
      return;
    }
    setSoundArmed(true);
  }

  if (!lobby) {
    return <main className="display-shell center"><h1>Room {code}</h1><p>Waiting for room...</p></main>;
  }

  const question = lobby.question;

  return (
    <main className="display-shell stack">
      <header className="display-header">
        <div>
          <p className="eyebrow">Room</p>
          <div className="display-code">{lobby.code}</div>
          <p>{lobby.playerCount} / {lobby.capacity} players</p>
          <span className={`status-pill ${realtimeStatus === "realtime" ? "live" : ""}`}>
            {realtimeStatus === "realtime" ? "Display connected" : "Display reconnecting"}
          </span>
        </div>
        <div className="display-tools">
          {joinUrl ? <QrCode value={joinUrl} size={150} /> : null}
          <button className="sound-arm" onClick={() => void enableSound()} disabled={soundArmed}>
            {soundArmed ? "Sound enabled" : "Enable sound"}
          </button>
          {soundError ? <p className="display-sound-error">{soundError}</p> : null}
        </div>
      </header>

      {soundTestName ? (
        <section className="buzz-stage locked" aria-live="polite">
          <p>SOUND CHECK</p>
          <strong>{soundTestName}</strong>
          <span>{soundArmed ? "TV sound played" : "Enable sound to hear it"}</span>
        </section>
      ) : null}

      {question ? (
        <section className={`display-question ${question.answerRevealed ? "answer-shown" : ""}`}>
          {!question.stimulusRevealed ? (
            <div className="display-question-ready">
              <p>QUESTION READY</p>
              <strong>WAIT FOR HOST</strong>
            </div>
          ) : (
            <>
              {question.prompt ? <h1>{question.prompt}</h1> : null}
              {question.assets.length > 0 ? (
                <div className={`display-question-images images-${Math.min(question.assets.length, 4)}`}>
                  {question.assets.map((asset, index) => asset.url ? (
                    <figure key={`${asset.storagePath}-${index}`}>
                      <Image src={asset.url} alt={asset.altText ?? `Question image ${index + 1}`} width={720} height={480} unoptimized priority={index === 0} />
                      {asset.caption ? <figcaption>{asset.caption}</figcaption> : null}
                    </figure>
                  ) : null)}
                </div>
              ) : null}
              {question.revealedHints.length > 0 ? (
                <div className="display-hints">
                  {question.revealedHints.map((hint, index) => <p key={`${index}-${hint}`}><span>Hint {index + 1}</span>{hint}</p>)}
                </div>
              ) : null}
              {question.answerRevealed ? (
                <div className="display-reveal">
                  <p>ANSWER</p>
                  <strong>{question.answer}</strong>
                  {question.explanation ? <div>{question.explanation}</div> : null}
                </div>
              ) : null}
            </>
          )}
        </section>
      ) : null}

      {!soundTestName ? (
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
            <><p>BUZZER</p><strong>{question?.stimulusRevealed ? "READY" : "WAITING"}</strong></>
          )}
        </section>
      ) : null}

      <section className="display-players" aria-label="Scoreboard">
        {lobby.players.map((player) => (
          <article className={lobby.buzz?.winnerId === player.id ? "display-player active-winner" : "display-player"} key={player.id}>
            <span className="seat">{player.seatOrder}</span>
            <strong className="display-player-name">{player.displayName}</strong>
            <strong className="display-score" aria-label={`${player.displayName} score`}>{player.score}</strong>
            <span className="display-sound">{player.isReady ? "✓ Ready" : player.soundType === "custom" ? "Custom sound" : soundLabel(player.soundKey)}</span>
          </article>
        ))}
      </section>
      {lobby.players.length === 0 ? <p className="display-waiting">Scan the QR to join</p> : null}
    </main>
  );
}
