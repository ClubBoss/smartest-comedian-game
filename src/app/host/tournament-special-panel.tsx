"use client";

import type { LobbyState } from "@/domain/lobby";
import { useCallback, useEffect, useMemo, useState } from "react";

type Submission = {
  playerId: string;
  playerName: string;
  answer: string;
  lockedAt: string;
  awardedPoints: number | null;
  awarded: boolean;
};

type SpecialRuntime = {
  tournament: null | {
    id: string;
    currentStage: string;
    status: "active" | "completed";
    currentPrize: number;
    championPlayerId: string | null;
    finalPayout: number | null;
    doubleAttempted: boolean;
    doubleCorrect: boolean | null;
    doubleResolved: boolean;
  };
  sessionId: string | null;
  submissions: Submission[];
  lastPlayed: boolean;
  doubleQueued: boolean;
};

export function TournamentSpecialPanel({
  lobby,
  hostToken,
  onRefresh,
}: {
  lobby: LobbyState;
  hostToken: string;
  onRefresh: () => Promise<unknown>;
}) {
  const [runtime, setRuntime] = useState<SpecialRuntime | null>(null);
  const [championId, setChampionId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!lobby.tournament) return;
    const response = await fetch(`/api/rooms/${lobby.code}/tournament/special`, {
      headers: { "x-host-token": hostToken },
      cache: "no-store",
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error ?? "Could not load tournament controls.");
    setRuntime(result);
  }, [hostToken, lobby.code, lobby.tournament]);

  useEffect(() => {
    if (!lobby.tournament) return;
    const first = window.setTimeout(() => void load().catch(() => undefined), 0);
    const interval = window.setInterval(() => void load().catch(() => undefined), 1000);
    return () => { window.clearTimeout(first); window.clearInterval(interval); };
  }, [load, lobby.tournament]);

  const finalMembers = useMemo(() => {
    if (!lobby.tournament) return [];
    return lobby.tournament.members
      .filter((member) => member.stage === "final")
      .sort((left, right) => right.score - left.score || left.seedOrder - right.seedOrder);
  }, [lobby.tournament]);

  useEffect(() => {
    if (!championId && finalMembers.length) setChampionId(finalMembers[0].playerId);
  }, [championId, finalMembers]);

  async function postSpecial(body: object) {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/rooms/${lobby.code}/tournament/special`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-host-token": hostToken },
        body: JSON.stringify(body),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Tournament action failed.");
      await Promise.all([onRefresh(), load()]);
      window.dispatchEvent(new Event("smartest-live-question-refresh"));
      return true;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Tournament action failed.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function startDoubleQuestion() {
    setBusy(true);
    setError(null);
    try {
      for (const action of ["start-next", "reveal-stimulus"]) {
        const response = await fetch(`/api/rooms/${lobby.code}/questions/action`, {
          method: "POST",
          headers: { "content-type": "application/json", "x-host-token": hostToken },
          body: JSON.stringify({ action }),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error ?? "Could not start Double or Nothing.");
      }
      await Promise.all([onRefresh(), load()]);
      window.dispatchEvent(new Event("smartest-live-question-refresh"));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not start Double or Nothing.");
    } finally {
      setBusy(false);
    }
  }

  const tournament = lobby.tournament;
  if (!tournament || !runtime?.tournament) return null;
  const question = lobby.question;
  const role = question?.tournamentRole ?? null;
  const pointsNow = role === "qualifier_super"
    ? question?.hintPointSchedule?.[Math.min(question.revealedHintCount, Math.max(0, question.hintPointSchedule.length - 1))] ?? Math.max(0, 3 - question.revealedHintCount)
    : 0;

  if (role === "qualifier_super") {
    return (
      <section className="card stack tournament-special-panel">
        <div className="split-heading"><div><p className="eyebrow">Super Question</p><h2>{pointsNow} points if correct</h2><p className="muted compact">Players answer privately on their phones. Reveal hints normally; the value drops automatically.</p></div><span className="status-pill live">{runtime.submissions.length}/4 LOCKED</span></div>
        {runtime.submissions.length ? <div className="stack">{runtime.submissions.map((submission) => (
          <div className="tournament-special-answer" key={submission.playerId}>
            <div><strong>{submission.playerName}</strong><p>{submission.answer}</p></div>
            {submission.awarded ? <span className="status-pill">{submission.awardedPoints! > 0 ? "+" : ""}{submission.awardedPoints}</span> : <div className="mini-actions"><button className="secondary" disabled={busy} onClick={() => void postSpecial({ action: "score_super", playerId: submission.playerId, correct: false })}>Wrong · 0</button><button className="primary" disabled={busy} onClick={() => void postSpecial({ action: "score_super", playerId: submission.playerId, correct: true })}>Correct · +{pointsNow}</button></div>}
          </div>
        ))}</div> : <p className="muted">Waiting for players to lock their answers…</p>}
        {error ? <p className="error">{error}</p> : null}
      </section>
    );
  }

  if (role === "team") {
    return (
      <section className="card stack tournament-special-panel">
        <div className="split-heading"><div><p className="eyebrow">Team Question</p><h2>One answer · everyone discusses</h2><p className="muted compact">This question changes the prize, not individual scores.</p></div><div className="tournament-prize-badge"><span>Prize</span><strong>{tournament.currentPrize} AZN</strong></div></div>
        <div className="host-actions"><button className="secondary" disabled={busy} onClick={() => void postSpecial({ action: "team", correct: false })}>Team wrong · keep 10</button><button className="primary" disabled={busy} onClick={() => void postSpecial({ action: "team", correct: true })}>Team correct · prize 12</button></div>
        {error ? <p className="error">{error}</p> : null}
      </section>
    );
  }

  if (role === "last") {
    return <section className="card tournament-special-panel"><p className="eyebrow">Last Question</p><h2>Correct +2 · Wrong -1</h2><p className="muted compact">After finishing it, the champion controls appear automatically.</p></section>;
  }

  if (role === "double_or_nothing") {
    return (
      <section className="card stack tournament-special-panel">
        <div><p className="eyebrow">Double or Nothing</p><h2>{runtime.tournament.currentPrize} → {runtime.tournament.currentPrize * 2} AZN or 0</h2><p className="muted compact">No buzzer. Winner chooses A/B/C. Reveal the answer, then mark the result.</p></div>
        <div className="host-actions"><button className="danger" disabled={busy} onClick={() => void postSpecial({ action: "double_result", correct: false })}>Wrong · prize burns</button><button className="primary" disabled={busy} onClick={() => void postSpecial({ action: "double_result", correct: true })}>Correct · double prize</button></div>
        {error ? <p className="error">{error}</p> : null}
      </section>
    );
  }

  if (tournament.currentStage === "final" && !question && runtime.lastPlayed) {
    return (
      <section className="card stack tournament-special-panel">
        <div><p className="eyebrow">Final result</p><h2>Lock the champion</h2><p className="muted compact">Final-stage scores only. Once locked, the winner can take the guaranteed prize or risk it.</p></div>
        <label className="field"><span>Champion</span><select value={championId} onChange={(event) => setChampionId(event.target.value)}>{finalMembers.map((member) => <option key={member.playerId} value={member.playerId}>{lobby.players.find((player) => player.id === member.playerId)?.displayName ?? "Player"} · {member.score}</option>)}</select></label>
        <button className="primary" disabled={busy || !championId} onClick={() => void postSpecial({ action: "champion", playerId: championId })}>Lock champion · {tournament.currentPrize} AZN guaranteed</button>
        {error ? <p className="error">{error}</p> : null}
      </section>
    );
  }

  if (tournament.currentStage === "complete") {
    const champion = lobby.players.find((player) => player.id === tournament.championPlayerId)?.displayName ?? "Champion";
    if (runtime.tournament.doubleResolved) {
      return <section className="card stack tournament-special-panel"><p className="eyebrow">Tournament complete</p><h2>{champion} wins {runtime.tournament.finalPayout ?? 0} AZN</h2><p className="muted compact">{runtime.tournament.doubleAttempted ? runtime.tournament.doubleCorrect ? "Double or Nothing: CORRECT." : "Double or Nothing: WRONG." : "Winner took the guaranteed prize."}</p></section>;
    }
    if (!question) {
      return (
        <section className="card stack tournament-special-panel">
          <div><p className="eyebrow">Champion · {champion}</p><h2>Take {runtime.tournament.currentPrize} or risk it?</h2><p className="muted compact">Risking starts the final A/B/C question immediately. Correct doubles the prize; wrong means 0.</p></div>
          <div className="host-actions"><button className="secondary" disabled={busy} onClick={() => void postSpecial({ action: "take" })}>Take {runtime.tournament.currentPrize} AZN</button><button className="danger" disabled={busy || !runtime.doubleQueued} onClick={() => void startDoubleQuestion()}>Double or Nothing</button></div>
          {error ? <p className="error">{error}</p> : null}
        </section>
      );
    }
  }

  return null;
}
