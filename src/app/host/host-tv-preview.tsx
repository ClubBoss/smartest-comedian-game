"use client";

import type { LobbyState } from "@/domain/lobby";
import { HOST_REACTIONS } from "@/domain/reactions";
import { useState } from "react";

export function HostTvPreview({ lobby }: { lobby: LobbyState }) {
  const question = lobby.question;
  const winner = lobby.buzz?.winnerName;
  const [sendingReaction, setSendingReaction] = useState<string | null>(null);
  const [reactionError, setReactionError] = useState<string | null>(null);

  async function sendReaction(key: string) {
    const hostToken = localStorage.getItem(`smartest-host-${lobby.code}`);
    if (!hostToken) {
      setReactionError("Host token is missing on this device.");
      return;
    }

    setSendingReaction(key);
    setReactionError(null);
    try {
      const response = await fetch(`/api/rooms/${lobby.code}/reaction`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-host-token": hostToken,
        },
        body: JSON.stringify({ key }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not send reaction.");
    } catch (caught) {
      setReactionError(caught instanceof Error ? caught.message : "Could not send reaction.");
    } finally {
      setSendingReaction(null);
    }
  }

  return (
    <section className="host-tv-preview" aria-label="TV preview">
      <div className="host-tv-preview-top">
        <span>TV PREVIEW</span>
        <strong>Room {lobby.code}</strong>
      </div>
      <div className="host-tv-preview-stage">
        {question?.stimulusRevealed ? (
          <>
            <strong className="host-tv-question">{question.prompt || "Image-led question"}</strong>
            {question.revealedHints.length > 0 ? <p>Hint: {question.revealedHints.at(-1)}</p> : null}
            {question.answerRevealed ? <p className="host-tv-answer">Answer: {question.answer}</p> : null}
          </>
        ) : (
          <strong>{question ? "QUESTION READY · PRIVATE" : "WAITING FOR QUESTION"}</strong>
        )}
      </div>
      <div className={`host-tv-buzz ${lobby.buzz?.status === "open" ? "open" : winner ? "winner" : ""}`}>
        {lobby.buzz?.status === "open" ? "BUZZERS OPEN" : winner ? `FIRST · ${winner}` : "BUZZER READY"}
      </div>
      <div className="host-tv-scores">
        {lobby.players.map((player) => (
          <span key={player.id}><b>{player.displayName}</b> {player.score}</span>
        ))}
      </div>

      <details className="host-reactions">
        <summary>🎭 Reactions</summary>
        <div className="host-reaction-grid" aria-label="Host reactions">
          {HOST_REACTIONS.map((reaction) => (
            <button
              key={reaction.key}
              type="button"
              className="secondary host-reaction-button"
              disabled={Boolean(sendingReaction)}
              onClick={() => void sendReaction(reaction.key)}
            >
              <span aria-hidden="true">{reaction.emoji}</span>
              <strong>{sendingReaction === reaction.key ? "Sending…" : reaction.label}</strong>
            </button>
          ))}
        </div>
        <p className="tiny muted compact">Plays once on the shared TV. Reactions never change score, buzzer state or game history.</p>
        {reactionError ? <p className="error compact">{reactionError}</p> : null}
      </details>
    </section>
  );
}
