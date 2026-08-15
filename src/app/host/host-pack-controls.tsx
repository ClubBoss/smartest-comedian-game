"use client";

import { useCallback, useEffect, useState } from "react";

type HostPack = { id: string; name: string; description: string | null; count: number };

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
    if (!response.ok) throw new Error(result.error ?? "Could not load packs.");
    setPacks(result.packs ?? []);
  }, [code, hostToken]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load().catch((caught) => setError(caught instanceof Error ? caught.message : "Could not load packs.")), 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  async function queue(randomize: boolean) {
    if (!packId) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch(`/api/rooms/${code}/packs`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-host-token": hostToken },
        body: JSON.stringify({ packId, randomize }),
      });
      const result = await response.json();
      if (!response.ok) {
        const message = result.error === "ERR_QUESTION_NOT_READY"
          ? "A question in this pack is no longer Ready. Update the pack in Question Bank."
          : result.error;
        throw new Error(message ?? "Could not queue pack.");
      }
      setNotice(`${result.count} questions queued${result.randomized ? " in shuffled order" : ""}.`);
      await onRoomRefresh();
      window.dispatchEvent(new Event("smartest-live-question-refresh"));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not queue pack.");
    } finally {
      setBusy(false);
    }
  }

  if (packs.length === 0) return null;

  return (
    <div className="stack pack-controls-inline">
      <div><p className="eyebrow">Question packs</p><strong>Queue a saved set</strong></div>
      <div className="question-picker-row">
        <select aria-label="Question pack" value={packId} onChange={(event) => setPackId(event.target.value)}>
          <option value="">Choose a pack...</option>
          {packs.map((pack) => <option key={pack.id} value={pack.id}>{pack.name} · {pack.count}</option>)}
        </select>
        <button className="secondary" disabled={busy || !packId} onClick={() => void queue(false)}>Queue pack</button>
        <button className="primary" disabled={busy || !packId} onClick={() => void queue(true)}>Queue shuffled</button>
      </div>
      {notice ? <p className="notice">{notice}</p> : null}
      {error ? <p className="error">{error}</p> : null}
    </div>
  );
}
