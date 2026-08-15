"use client";

import type { LobbyState } from "@/domain/lobby";

export function HostTvPreview({ lobby }: { lobby: LobbyState }) {
  const question = lobby.question;
  const winner = lobby.buzz?.winnerName;

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
    </section>
  );
}
