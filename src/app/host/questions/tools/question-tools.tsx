"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";

const ADMIN_KEY_STORAGE = "smartest-question-bank-admin-key";

type QuestionSummary = { id: string; prompt: string | null; answer: string; status: string; assets: unknown[] };
type ImportRow = Record<string, unknown>;

function splitCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"') {
      if (quoted && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else quoted = !quoted;
    } else if (char === "," && !quoted) {
      cells.push(current.trim());
      current = "";
    } else current += char;
  }
  cells.push(current.trim());
  return cells;
}

function parseCsv(text: string): ImportRow[] {
  const lines = text.replace(/\r\n/g, "\n").split("\n").filter((line) => line.trim());
  if (lines.length < 2) throw new Error("CSV needs a header row and at least one question.");
  const headers = splitCsvLine(lines[0]).map((header) => header.trim());
  const multi = new Set(["answerVariants", "hints", "tags"]);
  return lines.slice(1).map((line, index) => {
    const cells = splitCsvLine(line);
    const row: ImportRow = {};
    headers.forEach((header, cellIndex) => {
      const value = cells[cellIndex] ?? "";
      row[header] = multi.has(header) ? value.split("|").map((part) => part.trim()).filter(Boolean) : value;
    });
    if (!row.prompt || !row.answer) throw new Error(`CSV row ${index + 2} needs prompt and answer.`);
    return row;
  });
}

function parseImport(text: string): ImportRow[] {
  const trimmed = text.trim();
  if (!trimmed) throw new Error("Paste or load CSV/JSON first.");
  if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
    const parsed = JSON.parse(trimmed) as unknown;
    const rows = Array.isArray(parsed)
      ? parsed
      : parsed && typeof parsed === "object" && Array.isArray((parsed as { questions?: unknown }).questions)
        ? (parsed as { questions: unknown[] }).questions
        : null;
    if (!rows) throw new Error("JSON must be an array or { questions: [...] }.");
    return rows as ImportRow[];
  }
  return parseCsv(trimmed);
}

export function QuestionTools() {
  const [adminKey, setAdminKey] = useState("");
  const [keyInput, setKeyInput] = useState("");
  const [questions, setQuestions] = useState<QuestionSummary[]>([]);
  const [text, setText] = useState("prompt,answer,answerVariants,hints,category,tags,difficulty,status\n");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function load(key: string) {
    const response = await fetch("/api/questions", { headers: { "x-question-bank-key": key }, cache: "no-store" });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error ?? "Could not load questions.");
    setQuestions(result.questions ?? []);
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const saved = localStorage.getItem(ADMIN_KEY_STORAGE);
      if (!saved) return;
      setAdminKey(saved);
      setKeyInput(saved);
      void load(saved).catch((caught) => setError(caught instanceof Error ? caught.message : "Could not load questions."));
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
      setError(caught instanceof Error ? caught.message : "Could not unlock tools.");
    }
  }

  async function importRows() {
    if (!adminKey) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const rows = parseImport(text);
      if (rows.length > 250) throw new Error("Import is limited to 250 questions at a time.");
      const response = await fetch("/api/questions/import", {
        method: "POST",
        headers: { "content-type": "application/json", "x-question-bank-key": adminKey },
        body: JSON.stringify({ questions: rows }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not import questions.");
      setNotice(`Imported ${result.count} questions.`);
      await load(adminKey);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not import questions.");
    } finally {
      setBusy(false);
    }
  }

  async function duplicate(id: string) {
    if (!adminKey) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch(`/api/questions/${id}/duplicate`, {
        method: "POST",
        headers: { "x-question-bank-key": adminKey },
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not duplicate question.");
      setNotice("Draft duplicate created.");
      await load(adminKey);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not duplicate question.");
    } finally {
      setBusy(false);
    }
  }

  if (!adminKey) {
    return (
      <main className="stack narrow">
        <div><p className="eyebrow">Question Bank tools</p><h1>Bulk import & duplicate</h1><p className="muted">Use the same private owner key as Question Bank.</p></div>
        <form className="card stack" onSubmit={unlock}>
          <label className="field"><span>Admin key</span><input type="password" value={keyInput} onChange={(event) => setKeyInput(event.target.value)} /></label>
          <button className="primary">Unlock tools</button>
          {error ? <p className="error">{error}</p> : null}
        </form>
      </main>
    );
  }

  return (
    <main className="stack question-editor-shell">
      <div className="split-heading">
        <div><p className="eyebrow">Question Bank tools</p><h1>Bulk import & duplicate</h1></div>
        <Link className="secondary" href="/host/questions">Back to Question Bank</Link>
      </div>

      <section className="card stack">
        <div><h2>Bulk import</h2><p className="muted compact">Paste JSON or CSV. CSV headers: prompt, answer, answerVariants, hints, category, tags, difficulty, status. Separate multiple variants/hints/tags with |. Images stay in the normal editor.</p></div>
        <label className="upload-button">Load CSV/JSON file<input type="file" accept=".csv,.json,text/csv,application/json" onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void file.text().then(setText);
        }} /></label>
        <textarea aria-label="Bulk import data" rows={12} value={text} onChange={(event) => setText(event.target.value)} />
        <button className="primary" disabled={busy} onClick={() => void importRows()}>{busy ? "Working..." : "Import questions"}</button>
      </section>

      <section className="card stack">
        <div><h2>Duplicate an existing question</h2><p className="muted compact">Duplicates open as Draft. Photo assets are safely reused in private Storage.</p></div>
        <div className="player-list">
          {questions.map((question) => (
            <div className="player-row" key={question.id}>
              <div><strong>{question.prompt || "Image-led question"}</strong><p className="muted compact">{question.status} · {question.assets.length} image(s)</p></div>
              <button className="secondary" disabled={busy} onClick={() => void duplicate(question.id)}>Duplicate</button>
            </div>
          ))}
        </div>
      </section>
      {notice ? <p className="notice">{notice}</p> : null}
      {error ? <p className="error">{error}</p> : null}
    </main>
  );
}
