"use client";

import { useRoomState } from "@/hooks/use-room-state";
import { useState } from "react";

type QuestionRole = "regular" | "qualifier_super" | "team" | "last" | "double_or_nothing" | "tiebreak";

export function HostSpecialQuestionControls({
  code,
  hostToken,
  role,
  correctPoints,
  wrongPoints,
  onRefresh,
}: {
  code: string;
  hostToken: string;
  role: QuestionRole;
  correctPoints: number | null;
  wrongPoints: number | null;
  onRefresh: () => Promise<unknown>;
}) {
  const { state: lobby, refresh } = useRoomState(code);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (role === "regular" || !lobby) return null;

  async function post(path: string, body: object) {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/rooms/${code}/${path}`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-host-token": hostToken },
        body: JSON.stringify(body),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Не удалось сохранить действие.");
      await Promise.all([refresh(), onRefresh()]);
      return true;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Не удалось сохранить действие.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  const winnerId = lobby.buzz?.winnerId ?? null;
  const cycleId = lobby.buzz?.cycleId ?? null;
  const scoreResolved = Boolean(lobby.buzz?.scoreResolved);
  const positive = correctPoints ?? (role === "last" ? 2 : role === "qualifier_super" ? 3 : 1);
  const negative = wrongPoints ?? (role === "qualifier_super" ? 0 : -1);

  if (role === "team") {
    return (
      <div className="card stack special-question-box">
        <div>
          <p className="eyebrow">Командный вопрос</p>
          <strong>Один общий ответ · личные очки не меняются</strong>
          <p className="muted compact">Если ответ правильный, денежный приз финала станет 12 AZN вместо 10 AZN.</p>
        </div>
        <div className="host-actions">
          <button className="primary" disabled={busy} onClick={() => void post("tournament/final", { action: "team-correct" })}>Правильно · приз 12 AZN</button>
          <button className="secondary" disabled={busy} onClick={() => void post("tournament/final", { action: "team-wrong" })}>Неправильно · приз 10 AZN</button>
        </div>
        {error ? <p className="error">{error}</p> : null}
      </div>
    );
  }

  if (role === "double_or_nothing") {
    return (
      <div className="card stack special-question-box">
        <div>
          <p className="eyebrow">Удвоение приза</p>
          <strong>Только победитель · обычный buzzer не используется</strong>
          <p className="muted compact">Сначала победитель решает, рискует ли призом. Если играет — после ответа нажми один итог.</p>
        </div>
        <div className="host-actions">
          <button className="primary" disabled={busy} onClick={() => void post("tournament/final", { action: "double-correct" })}>Ответ правильный · ×2</button>
          <button className="danger" disabled={busy} onClick={() => void post("tournament/final", { action: "double-wrong" })}>Ответ неправильный · 0 AZN</button>
          <button className="secondary" disabled={busy} onClick={() => void post("tournament/final", { action: "take" })}>Забрать текущий приз</button>
        </div>
        {error ? <p className="error">{error}</p> : null}
      </div>
    );
  }

  const title = role === "qualifier_super"
    ? `Супер-вопрос · +${positive}`
    : role === "last"
      ? `Последний вопрос · +${positive}`
      : "Тай-брейк";

  return (
    <div className="card stack special-question-box">
      <div>
        <p className="eyebrow">{title}</p>
        <strong>{winnerId ? `${lobby.buzz?.winnerName ?? "Игрок"} отвечает` : "Открой buzzer как обычно"}</strong>
        <p className="muted compact">Готовые кнопки ниже записывают нужные очки без ручного набора.</p>
      </div>
      <div className="host-actions">
        <button
          className="primary"
          disabled={busy || !winnerId || !cycleId || scoreResolved}
          onClick={() => void post("score/answer", { playerId: winnerId, cycleId, delta: positive })}
        >
          Правильно · +{positive}
        </button>
        <button
          className="secondary"
          disabled={busy || !winnerId || !cycleId || scoreResolved}
          onClick={() => void post("score/answer", { playerId: winnerId, cycleId, delta: negative })}
        >
          Неправильно · {negative > 0 ? "+" : ""}{negative}
        </button>
      </div>
      {scoreResolved ? <p className="notice">Результат уже записан: {lobby.buzz?.scoreDelta! > 0 ? "+" : ""}{lobby.buzz?.scoreDelta}</p> : null}
      {error ? <p className="error">{error}</p> : null}
    </div>
  );
}
