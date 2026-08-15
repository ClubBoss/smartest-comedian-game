"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";

const ADMIN_KEY_STORAGE = "smartest-question-bank-admin-key";

type QuestionRef = { id: string; prompt: string | null; category: string | null; status: string };
type Pack = { id: string; name: string; description: string | null; questionIds: string[]; questions: QuestionRef[] };
type PackPayload = { packs: Pack[]; questions: QuestionRef[]; readyQuestions: QuestionRef[] };

export function QuestionPacks() {
  const [adminKey, setAdminKey] = useState("");
  const [keyInput, setKeyInput] = useState("");
  const [data, setData] = useState<PackPayload>({ packs: [], questions: [], readyQuestions: [] });
  const [packId, setPackId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [questionIds, setQuestionIds] = useState<string[]>([]);
  const [addQuestionId, setAddQuestionId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function load(key: string) {
    const response = await fetch("/api/question-packs", { headers: { "x-question-bank-key": key }, cache: "no-store" });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error ?? "Could not load question packs.");
    setData(result as PackPayload);
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const saved = localStorage.getItem(ADMIN_KEY_STORAGE);
      if (!saved) return;
      setAdminKey(saved);
      setKeyInput(saved);
      void load(saved).catch((caught) => setError(caught instanceof Error ? caught.message : "Could not load question packs."));
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  async function unlock(event: FormEvent) {
    event.preventDefault();
    const key = keyInput.trim();
    if (!key) return;
    setError(null);
    try {
      await load(key);
      localStorage.setItem(ADMIN_KEY_STORAGE, key);
      setAdminKey(key);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not unlock packs.");
    }
  }

  function edit(pack: Pack) {
    setPackId(pack.id);
    setName(pack.name);
    setDescription(pack.description ?? "");
    setQuestionIds(pack.questionIds);
    setNotice(null);
    setError(null);
  }

  function reset() {
    setPackId(null);
    setName("");
    setDescription("");
    setQuestionIds([]);
    setAddQuestionId("");
    setNotice(null);
    setError(null);
  }

  function move(index: number, delta: -1 | 1) {
    const next = [...questionIds];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setQuestionIds(next);
  }

  async function save() {
    if (!adminKey) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch("/api/question-packs", {
        method: "POST",
        headers: { "content-type": "application/json", "x-question-bank-key": adminKey },
        body: JSON.stringify({ id: packId, name, description, questionIds }),
      });
      const result = await response.json();
      if (!response.ok) {
        const message = result.error === "ERR_QUESTION_NOT_READY"
          ? "Remove or replace archived/unavailable questions before saving this pack."
          : result.error;
        throw new Error(message ?? "Could not save question pack.");
      }
      setPackId(result.id);
      setNotice("Question pack saved.");
      await load(adminKey);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save question pack.");
    } finally {
      setBusy(false);
    }
  }

  if (!adminKey) {
    return (
      <main className="stack narrow">
        <div><p className="eyebrow">Question packs</p><h1>Saved game sets</h1><p className="muted">Use the same private owner key as Question Bank.</p></div>
        <form className="card stack" onSubmit={unlock}>
          <label className="field"><span>Admin key</span><input type="password" value={keyInput} onChange={(event) => setKeyInput(event.target.value)} /></label>
          <button className="primary">Unlock packs</button>
          {error ? <p className="error">{error}</p> : null}
        </form>
      </main>
    );
  }

  const selectedQuestions = questionIds
    .map((id) => data.questions.find((question) => question.id === id) ?? { id, prompt: "Unavailable question", category: null, status: "unavailable" })
    .filter((question): question is QuestionRef => Boolean(question));
  const availableQuestions = data.readyQuestions.filter((question) => !questionIds.includes(question.id));
  const hasUnavailable = selectedQuestions.some((question) => question.status !== "ready");

  return (
    <main className="stack question-editor-shell">
      <div className="split-heading">
        <div><p className="eyebrow">Question packs</p><h1>Saved game sets</h1><p className="muted">Build a reusable ordered set once, then queue it normally or shuffled from Host.</p></div>
        <div className="host-actions"><button className="secondary" onClick={reset}>New pack</button><Link className="secondary" href="/host/questions">Back to Question Bank</Link></div>
      </div>

      <div className="lobby-grid">
        <section className="card stack">
          <h2>Saved packs</h2>
          {data.packs.length === 0 ? <p className="muted">No packs yet.</p> : null}
          <div className="player-list">
            {data.packs.map((pack) => (
              <button className="player-row" key={pack.id} onClick={() => edit(pack)}>
                <span><strong>{pack.name}</strong><span className="muted compact">{pack.questionIds.length} questions</span></span>
                <span>Edit</span>
              </button>
            ))}
          </div>
        </section>

        <section className="card stack">
          <div><p className="eyebrow">{packId ? "Edit pack" : "New pack"}</p><h2>{name || "Untitled pack"}</h2></div>
          <label className="field"><span>Name</span><input maxLength={120} value={name} onChange={(event) => setName(event.target.value)} placeholder="Family Night" /></label>
          <label className="field"><span>Description</span><textarea rows={3} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Optional note about this set" /></label>
          <div className="question-picker-row">
            <select value={addQuestionId} onChange={(event) => setAddQuestionId(event.target.value)}>
              <option value="">Add a Ready question...</option>
              {availableQuestions.map((question) => <option key={question.id} value={question.id}>{question.prompt || "Image-led question"}{question.category ? ` · ${question.category}` : ""}</option>)}
            </select>
            <button className="secondary" disabled={!addQuestionId} onClick={() => {
              if (!addQuestionId) return;
              setQuestionIds((current) => [...current, addQuestionId]);
              setAddQuestionId("");
            }}>Add</button>
          </div>
          {hasUnavailable ? <p className="error">This pack contains archived or unavailable questions. Remove or replace them before saving or queueing the pack.</p> : null}
          <div className="player-list">
            {selectedQuestions.map((question, index) => (
              <div className="player-row" key={question.id}>
                <span className="seat">{index + 1}</span>
                <span><strong>{question.prompt || "Image-led question"}</strong>{question.status !== "ready" ? <span className="error compact">{question.status}</span> : null}</span>
                <div className="mini-actions">
                  <button className="secondary" disabled={index === 0} onClick={() => move(index, -1)}>Up</button>
                  <button className="secondary" disabled={index === selectedQuestions.length - 1} onClick={() => move(index, 1)}>Down</button>
                  <button className="secondary" onClick={() => setQuestionIds((current) => current.filter((id) => id !== question.id))}>Remove</button>
                </div>
              </div>
            ))}
          </div>
          <button className="primary" disabled={busy || !name.trim() || questionIds.length === 0 || hasUnavailable} onClick={() => void save()}>{busy ? "Saving..." : "Save pack"}</button>
          {notice ? <p className="notice">{notice}</p> : null}
          {error ? <p className="error">{error}</p> : null}
        </section>
      </div>
    </main>
  );
}
