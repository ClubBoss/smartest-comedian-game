"use client";

import { useRoomState } from "@/hooks/use-room-state";
import { useEffect, useState } from "react";

type StoredIdentity = {
  playerId: string;
  reconnectToken: string;
};

export function PlayerSpecialAnswerDock({ code }: { code: string }) {
  const { state: lobby } = useRoomState(code);
  const [identity, setIdentity] = useState<StoredIdentity | null>(null);
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lockedSessionId, setLockedSessionId] = useState<string | null>(null);

  useEffect(() => {
    const sync = () => {
      const raw = localStorage.getItem(`smartest-player-${code}`);
      if (!raw) return setIdentity(null);
      try {
        const parsed = JSON.parse(raw) as StoredIdentity;
        setIdentity(parsed?.playerId && parsed?.reconnectToken ? parsed : null);
      } catch {
        setIdentity(null);
      }
    };
    sync();
    const interval = window.setInterval(sync, 750);
    return () => window.clearInterval(interval);
  }, [code]);

  const question = lobby?.question;
  const isActivePlayer = Boolean(identity && lobby?.tournament?.activePlayerIds.includes(identity.playerId));
  const isSuper = question?.tournamentRole === "qualifier_super" && question.stimulusRevealed && isActivePlayer;

  useEffect(() => {
    if (!question?.sessionId) return;
    const locked = localStorage.getItem(`smartest-super-locked-${code}-${question.sessionId}`) === "1";
    setLockedSessionId(locked ? question.sessionId : null);
    setAnswer("");
    setError(null);
  }, [code, question?.sessionId]);

  if (!identity || !isSuper || !question) return null;
  const locked = lockedSessionId === question.sessionId;
  const schedule = question.hintPointSchedule.length ? question.hintPointSchedule : [3, 2, 1, 0];
  const points = schedule[Math.min(question.revealedHintCount, schedule.length - 1)] ?? 0;

  async function submit() {
    if (!identity || !question || !answer.trim() || locked) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/rooms/${code}/special-answer`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-player-token": identity.reconnectToken,
        },
        body: JSON.stringify({ playerId: identity.playerId, sessionId: question.sessionId, answer }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not lock answer.");
      localStorage.setItem(`smartest-super-locked-${code}-${question.sessionId}`, "1");
      setLockedSessionId(question.sessionId);
      navigator.vibrate?.([30, 25, 50]);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not lock answer.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <aside className="player-special-answer-dock" aria-live="polite">
      <div className="card stack">
        <div className="split-heading">
          <div><p className="eyebrow">Super Question</p><strong>{points} points available</strong></div>
          <span className={`status-pill ${locked ? "live" : ""}`}>{locked ? "ANSWER LOCKED" : "PRIVATE ANSWER"}</span>
        </div>
        {locked ? (
          <p className="notice">Your answer is locked. Wait for the host to reveal and score all answers.</p>
        ) : (
          <>
            <label className="field"><span>Your final answer</span><input value={answer} maxLength={500} autoComplete="off" placeholder="Type one clear answer…" onChange={(event) => setAnswer(event.target.value)} /></label>
            <button className="primary" disabled={busy || !answer.trim()} onClick={() => void submit()}>{busy ? "Locking..." : `Lock answer · ${points} pts`}</button>
            <p className="tiny muted">You cannot edit the answer after locking it. The value drops as hints are revealed.</p>
          </>
        )}
        {error ? <p className="error">{error}</p> : null}
      </div>
    </aside>
  );
}
