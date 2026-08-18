"use client";

import { useCallback, useEffect, useState } from "react";

type HostPack = {
  id: string;
  name: string;
  description: string | null;
  count: number;
  hasSpecialQuestions: boolean;
};

export function HostPackControls({ code, hostToken, onRoomRefresh }: { code: string; hostToken: string; onRoomRefresh: () => Promise<unknown> }) {
  const [packs, setPacks] = useState<HostPack[]>([]);
  const [packId, setPackId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    const response = await fetch(`/api/rooms/${code}/packs`, {
      headers: { "x-host-token": hostToken },
      cache: "no-store",
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error ?? "Не удалось загрузить список игр.");
    setPacks(result.packs ?? []);
  }, [code, hostToken]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load().catch((caught) => setError(caught instanceof Error ? caught.message : "Не удалось загрузить список игр.")), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function loadGame() {
    if (!packId) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch(`/api/rooms/${code}/packs`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-host-token": hostToken },
        body: JSON.stringify({ packId }),
      });
      const result = await response.json();
      if (!response.ok) {
        const messages: Record<string, string> = {
          ERR_QUESTION_ACTIVE: "Сначала закончи текущий вопрос, затем загружай следующую игру.",
          ERR_QUESTION_NOT_READY: "В этом наборе есть недоступный вопрос. Сначала обнови набор.",
          ERR_PACK_EMPTY: "В этом наборе пока нет вопросов.",
          ERR_PACK_NOT_FOUND: "Этот набор больше не существует.",
        };
        throw new Error(messages[result.error] ?? result.error ?? "Не удалось загрузить игру.");
      }
      setNotice(`${result.packName ?? "Игра"} загружена · ${result.count} вопросов.`);
      await onRoomRefresh();
      window.dispatchEvent(new Event("smartest-live-question-refresh"));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Не удалось загрузить игру.");
    } finally {
      setBusy(false);
    }
  }

  if (packs.length === 0) return null;

  const selected = packs.find((pack) => pack.id === packId) ?? null;

  return (
    <div className="stack pack-controls-inline">
      <div>
        <p className="eyebrow">Готовая игра</p>
        <strong>Загрузи пакет вопросов</strong>
        <p className="muted compact">Для нашего вечера просто выбирай по очереди: Игра 1 → Игра 2 → Финал.</p>
      </div>
      <div className="question-picker-row">
        <select aria-label="Готовая игра" value={packId} onChange={(event) => setPackId(event.target.value)}>
          <option value="">Выбрать игру...</option>
          {packs.map((pack) => <option key={pack.id} value={pack.id}>{pack.name} · {pack.count}</option>)}
        </select>
        <button className="primary" disabled={busy || !packId} onClick={() => void loadGame()}>
          {busy ? "Загружаю..." : "Загрузить игру"}
        </button>
      </div>
      {selected?.description ? <p className="muted compact">{selected.description}</p> : null}
      {selected?.hasSpecialQuestions ? <p className="tiny muted">Супер-, командные и финальные вопросы уже отмечены. Во время игры ведущий увидит короткую подсказку.</p> : null}
      {notice ? <p className="notice">{notice}</p> : null}
      {error ? <p className="error">{error}</p> : null}
    </div>
  );
}
