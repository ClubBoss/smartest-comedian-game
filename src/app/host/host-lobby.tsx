"use client";

import { QrCode } from "@/components/qr-code";
import { soundLabel } from "@/domain/sounds";
import { useRoomPresence } from "@/hooks/use-room-presence";
import { useRoomState } from "@/hooks/use-room-state";
import { useEffect, useMemo, useState } from "react";
import { HostSoundSetup } from "./host-sound-setup";
import { HostTvPreview } from "./host-tv-preview";
import { LiveQuestionPanel, type QuestionReadiness } from "./live-question-panel";

const CURRENT_ROOM_KEY = "smartest-host-current-room";

function shouldIgnoreHotkey(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
}

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
  const [gameMode, setGameMode] = useState(false);
  const [answerScoreDraft, setAnswerScoreDraft] = useState<{ cycleId: string | null; delta: number | null }>({ cycleId: null, delta: null });
  const [questionReadiness, setQuestionReadiness] = useState<QuestionReadiness>({ readyQuestions: 0, queued: 0, current: false });
  const { state: lobby, error, refresh } = useRoomState(roomCode);
  const { status: realtimeStatus, presence } = useRoomPresence(roomCode, roomCode ? "host" : null, "host-console");

  useEffect(() => {
    const initial = window.setTimeout(() => {
      const savedCode = localStorage.getItem(CURRENT_ROOM_KEY);
      if (!savedCode) return;
      setRoomCode(savedCode);
      setHostToken(localStorage.getItem(`smartest-host-${savedCode}`));
    }, 0);
    return () => window.clearTimeout(initial);
  }, []);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.repeat || shouldIgnoreHotkey(event.target)) return;
      const key = event.key.toLowerCase();
      const selector = key === " "
        ? '[data-host-hotkey="space"]'
        : key === "1"
          ? '[data-host-hotkey="1"]'
          : key === "0"
            ? '[data-host-hotkey="0"]'
            : key === "-"
              ? '[data-host-hotkey="-"]'
              : key === "h"
                ? '[data-host-hotkey="h"]'
                : key === "a"
                  ? '[data-host-hotkey="a"]'
                  : key === "n"
                    ? '[data-host-hotkey="n"]'
                    : null;
      if (!selector) return;
      const button = document.querySelector<HTMLButtonElement>(selector);
      if (!button || button.disabled) return;
      event.preventDefault();
      button.click();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
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

  function adjustAnswerScore(step: -1 | 1) {
    const cycleId = lobby?.buzz?.cycleId ?? null;
    if (!cycleId || lobby?.buzz?.scoreResolved) return;
    setAnswerScoreDraft((current) => ({
      cycleId,
      delta: (current.cycleId === cycleId && current.delta !== null ? current.delta : 0) + step,
    }));
  }

  function setZeroAnswerScore() {
    const cycleId = lobby?.buzz?.cycleId ?? null;
    if (!cycleId || lobby?.buzz?.scoreResolved) return;
    setAnswerScoreDraft({ cycleId, delta: 0 });
  }

  async function confirmAnswerScore() {
    const buzz = lobby?.buzz;
    if (!buzz?.winnerId || answerScoreDraft.cycleId !== buzz.cycleId || answerScoreDraft.delta === null) return;
    const ok = await postHost("score/answer", {
      playerId: buzz.winnerId,
      cycleId: buzz.cycleId,
      delta: answerScoreDraft.delta,
    });
    if (ok) setAnswerScoreDraft({ cycleId: buzz.cycleId, delta: null });
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
  const pendingAnswerDelta = answerScoreDraft.cycleId === lobby.buzz?.cycleId ? answerScoreDraft.delta : null;
  const readyCount = lobby.players.filter((player) => player.isReady).length;
  const allPlayersReady = lobby.playerCount >= 2 && readyCount === lobby.playerCount;
  const questionPrepared = questionReadiness.current || questionReadiness.queued > 0 || questionReadiness.readyQuestions > 0;
  const displayConnected = presence.displays > 0;
  const displaySoundReady = presence.soundReadyDisplays > 0;

  const nextAction = !lobby.question
    ? questionReadiness.queued > 0 ? "Preload the next queued question" : "Choose or queue a question"
    : !lobby.question.stimulusRevealed
      ? "Show the question on TV"
      : buzzOpen
        ? "Wait for the first buzz"
        : winner && !lobby.buzz?.scoreResolved
          ? `Choose and confirm ${winner.displayName}'s score`
          : winner && lobby.buzz?.scoreResolved
            ? "Reopen the buzzer or continue the question"
            : lobby.question.answerRevealed
              ? "Finish the question"
              : "Open the buzzer";

  return (
    <div className={gameMode ? "host-game-mode" : ""}>
      <main className="stack host-shell">
        <div className="split-heading">
          <div>
            <p className="eyebrow">Host console</p>
            <h1>Room {lobby.code}</h1>
            <p className="muted">{lobby.playerCount} / {lobby.capacity} players joined · {readyCount} ready</p>
          </div>
          <div className="host-actions">
            <button className={gameMode ? "primary" : "secondary"} onClick={() => setGameMode((value) => !value)}>
              {gameMode ? "Exit Game Mode" : "Enter Game Mode"}
            </button>
            {!gameMode ? <button className="secondary" onClick={() => {
              localStorage.removeItem(CURRENT_ROOM_KEY);
              setRoomCode(null);
              setHostToken(null);
            }}>New room</button> : null}
          </div>
        </div>

        <section className="host-game-mode-banner">
          <div><strong>{gameMode ? "Game Mode ON" : "Control Mode"}</strong><p className="muted compact">{gameMode ? "Only the live-flow controls stay prominent. Exit anytime for recovery tools." : "Prepare the room, then switch to Game Mode for the live round."}</p></div>
          <span className={`status-pill ${realtimeStatus === "realtime" ? "live" : ""}`}>{realtimeStatus === "realtime" ? "Realtime connected" : "Fallback connection"}</span>
        </section>

        {!gameMode ? (
          <section className="host-preflight stack" aria-label="Pre-game check">
            <div className="split-heading"><div><p className="eyebrow">Pre-game check</p><h2>{allPlayersReady && displayConnected && displaySoundReady && questionPrepared ? "Ready to play" : "Finish setup"}</h2></div><strong>{readyCount}/{lobby.playerCount} ready</strong></div>
            <div className="host-preflight-grid">
              <div className={`host-preflight-item ${realtimeStatus === "realtime" ? "pass" : "warn"}`}><span>Realtime</span><strong>{realtimeStatus === "realtime" ? "✓" : "Check"}</strong></div>
              <div className={`host-preflight-item ${displayConnected ? "pass" : "warn"}`}><span>TV Display</span><strong>{displayConnected ? "✓" : "Missing"}</strong></div>
              <div className={`host-preflight-item ${displaySoundReady ? "pass" : "warn"}`}><span>TV sound</span><strong>{displaySoundReady ? "✓" : "Enable"}</strong></div>
              <div className={`host-preflight-item ${lobby.playerCount >= 2 ? "pass" : "warn"}`}><span>Players</span><strong>{lobby.playerCount}/2+</strong></div>
              <div className={`host-preflight-item ${allPlayersReady ? "pass" : "warn"}`}><span>Ready</span><strong>{readyCount}/{lobby.playerCount}</strong></div>
              <div className={`host-preflight-item ${questionPrepared ? "pass" : "warn"}`}><span>Questions</span><strong>{questionPrepared ? "✓" : "Add"}</strong></div>
            </div>
            <p className="tiny muted">Live controller tabs detected: {presence.players}/{lobby.playerCount}. This is diagnostic only; it never blocks the host.</p>
          </section>
        ) : null}

        {!gameMode && hostToken ? (
          <HostSoundSetup
            code={lobby.code}
            hostToken={hostToken}
            players={lobby.players}
            availableSoundKeys={lobby.availableSoundKeys}
            onRefresh={refresh}
          />
        ) : null}

        <section className="host-next-action" aria-live="polite">
          <div><p className="eyebrow">Next action</p><strong>{nextAction}</strong></div>
          <span className="status-pill">{gameMode ? "LIVE FLOW" : "GUIDANCE"}</span>
        </section>

        {hostToken ? <LiveQuestionPanel code={lobby.code} hostToken={hostToken} onRoomRefresh={refresh} gameMode={gameMode} onReadinessChange={setQuestionReadiness} /> : null}

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
              className={`primary ${buzzLocked ? "next-action" : ""}`}
              data-host-hotkey="space"
              disabled={lobby.playerCount < 2 || buzzOpen || !lobby.question?.stimulusRevealed}
              onClick={() => void postHost("buzz/open")}
            >
              {buzzLocked ? "REOPEN BUZZER" : "Open buzzer"}
            </button>
            <button className="secondary" disabled={!buzzOpen} onClick={() => void postHost("buzz/close")}>Close</button>
          </div>

          {winner ? (
            <div className="score-winner stack">
              <div className="split-heading">
                <div>
                  <p className="eyebrow">Answer score</p>
                  <h2>{winner.displayName} · {winner.score}</h2>
                  {!lobby.buzz?.scoreResolved ? <p className="muted compact">Build the score first. Nothing changes until you confirm.</p> : null}
                </div>
                {lobby.buzz?.scoreResolved ? (
                  <span className="status-pill">Recorded {lobby.buzz.scoreDelta! > 0 ? "+" : ""}{lobby.buzz.scoreDelta}</span>
                ) : pendingAnswerDelta !== null ? (
                  <span className="status-pill live">Pending {pendingAnswerDelta > 0 ? "+" : ""}{pendingAnswerDelta}</span>
                ) : <span className="status-pill">Not scored</span>}
              </div>
              <div className="answer-score-actions">
                <button
                  data-host-hotkey="-"
                  className="secondary score-button"
                  disabled={Boolean(lobby.buzz?.scoreResolved)}
                  onClick={() => adjustAnswerScore(-1)}
                >-1</button>
                <button
                  data-host-hotkey="0"
                  className="secondary score-button"
                  disabled={Boolean(lobby.buzz?.scoreResolved)}
                  onClick={setZeroAnswerScore}
                >0</button>
                <button
                  data-host-hotkey="1"
                  className="primary score-button next-action"
                  disabled={Boolean(lobby.buzz?.scoreResolved)}
                  onClick={() => adjustAnswerScore(1)}
                >+1</button>
              </div>
              {!lobby.buzz?.scoreResolved ? (
                <div className="answer-score-confirm">
                  <strong className="answer-score-pending">{pendingAnswerDelta === null ? "Choose a score" : `Pending: ${pendingAnswerDelta > 0 ? "+" : ""}${pendingAnswerDelta}`}</strong>
                  <button className="primary" disabled={pendingAnswerDelta === null} onClick={() => void confirmAnswerScore()}>
                    {pendingAnswerDelta === null ? "Confirm score" : `Confirm ${pendingAnswerDelta > 0 ? "+" : ""}${pendingAnswerDelta}`}
                  </button>
                  <button className="secondary" disabled={pendingAnswerDelta === null} onClick={() => setAnswerScoreDraft({ cycleId: lobby.buzz?.cycleId ?? null, delta: null })}>Discard</button>
                </div>
              ) : null}
            </div>
          ) : null}

          {!gameMode && lobby.buzz ? (
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

        <HostTvPreview lobby={lobby} />

        <section className="host-hotkeys" aria-label="Host keyboard shortcuts">
          <span><kbd>Space</kbd>open/reopen</span><span><kbd>1</kbd>+1 draft</span><span><kbd>0</kbd>zero draft</span><span><kbd>-</kbd>-1 draft</span><span><kbd>H</kbd>hint</span><span><kbd>A</kbd>answer</span><span><kbd>N</kbd>next/finish</span>
        </section>

        <div className="host-secondary-admin stack">
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
                    <span className="sound-pill">{player.isReady ? "✓ Ready" : player.soundType === "custom" ? "Custom sound" : soundLabel(player.soundKey)}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
