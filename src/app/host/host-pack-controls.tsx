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
    if (!response.ok) throw new Error(result.error ?? "Could not load game packs.");
    setPacks(result.packs ?? []);
  }, [code, hostToken]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load().catch((caught) => setError(caught instanceof Error ? caught.message : "Could not load game packs.")), 0);
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
          ERR_QUESTION_NOT_READY: "This pack contains a question that is no longer Ready. Update the pack first.",
          ERR_PACK_EMPTY: "This pack is empty.",
          ERR_PACK_NOT_FOUND: "This pack no longer exists.",
        };
        throw new Error(messages[result.error] ?? result.error ?? "Could not load game pack.");
      }
      setNotice(`${result.packName ?? "Game pack"} loaded · ${result.count} questions in saved order.`);
      await onRoomRefresh();
      window.dispatchEvent(new Event("smartest-live-question-refresh"));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load game pack.");
    } finally {
      setBusy(false);
    }
  }

  if (packs.length === 0) return null;

  const selected = packs.find((pack) => pack.id === packId) ?? null;

  return (
    <div className="stack pack-controls-inline">
      <div>
        <p className="eyebrow">Game pack</p>
        <strong>Load the questions for this game</strong>
        <p className="muted compact">Pick Game 1, Game 2 or Final. The saved order is preserved automatically.</p>
      </div>
      <div className="question-picker-row">
        <select aria-label="Game pack" value={packId} onChange={(event) => setPackId(event.target.value)}>
          <option value="">Choose a game pack...</option>
          {packs.map((pack) => <option key={pack.id} value={pack.id}>{pack.name} · {pack.count}</option>)}
        </select>
        <button className="primary" disabled={busy || !packId} onClick={() => void loadGame()}>
          {busy ? "Loading..." : "Load this game"}
        </button>
      </div>
      {selected?.description ? <p className="muted compact">{selected.description}</p> : null}
      {selected?.hasSpecialQuestions ? <p className="tiny muted">Special questions in this pack keep their saved roles and scoring presets.</p> : null}
      {notice ? <p className="notice">{notice}</p> : null}
      {error ? <p className="error">{error}</p> : null}
    </div>
  );
}
