"use client";

import Image from "next/image";
import { FormEvent, useEffect, useMemo, useState } from "react";

const ADMIN_KEY_STORAGE = "smartest-question-bank-admin-key";

type QuestionStatus = "draft" | "ready" | "archived";
type QuestionView = "active" | "archive";

type ExistingAsset = {
  kind: "existing";
  id: string;
  storagePath: string;
  mimeType: string;
  altText: string;
  caption: string;
  width: number | null;
  height: number | null;
  previewUrl: string | null;
};

type NewAsset = {
  kind: "new";
  clientId: string;
  file: File;
  altText: string;
  caption: string;
  previewUrl: string;
};

type EditorAsset = ExistingAsset | NewAsset;

type QuestionRecord = {
  id: string;
  prompt: string | null;
  answer: string;
  answerVariants: string[];
  explanation: string | null;
  hostNotes: string | null;
  category: string | null;
  difficulty: number | null;
  sourceLabel: string | null;
  sourceUrl: string | null;
  status: QuestionStatus;
  createdAt: string;
  updatedAt: string;
  hints: string[];
  tags: string[];
  assets: Array<{
    id: string;
    storagePath: string;
    mimeType: string;
    altText: string | null;
    caption: string | null;
    width: number | null;
    height: number | null;
    previewUrl: string | null;
  }>;
};

type EditorState = {
  id: string | null;
  prompt: string;
  answer: string;
  answerVariants: string;
  explanation: string;
  hostNotes: string;
  category: string;
  difficulty: string;
  sourceLabel: string;
  sourceUrl: string;
  status: QuestionStatus;
  hints: string[];
  tags: string;
  assets: EditorAsset[];
};

function emptyEditor(): EditorState {
  return {
    id: null,
    prompt: "",
    answer: "",
    answerVariants: "",
    explanation: "",
    hostNotes: "",
    category: "",
    difficulty: "",
    sourceLabel: "",
    sourceUrl: "",
    status: "draft",
    hints: [],
    tags: "",
    assets: [],
  };
}

function editorFromRecord(question: QuestionRecord): EditorState {
  return {
    id: question.id,
    prompt: question.prompt ?? "",
    answer: question.answer,
    answerVariants: question.answerVariants.join("\n"),
    explanation: question.explanation ?? "",
    hostNotes: question.hostNotes ?? "",
    category: question.category ?? "",
    difficulty: question.difficulty ? String(question.difficulty) : "",
    sourceLabel: question.sourceLabel ?? "",
    sourceUrl: question.sourceUrl ?? "",
    status: question.status,
    hints: [...question.hints],
    tags: question.tags.join(", "),
    assets: question.assets.map((asset) => ({
      kind: "existing" as const,
      id: asset.id,
      storagePath: asset.storagePath,
      mimeType: asset.mimeType,
      altText: asset.altText ?? "",
      caption: asset.caption ?? "",
      width: asset.width,
      height: asset.height,
      previewUrl: asset.previewUrl,
    })),
  };
}

function moveItem<T>(items: T[], index: number, direction: -1 | 1): T[] {
  const target = index + direction;
  if (target < 0 || target >= items.length) return items;
  const copy = [...items];
  [copy[index], copy[target]] = [copy[target], copy[index]];
  return copy;
}

function statusLabel(status: QuestionStatus) {
  return status === "ready" ? "Ready" : status === "archived" ? "Archived" : "Draft";
}

function questionLabel(question: QuestionRecord) {
  const label = question.prompt?.trim() || "Image-led question";
  return label.length > 80 ? `${label.slice(0, 77)}...` : label;
}

export function QuestionBank() {
  const [adminKey, setAdminKey] = useState("");
  const [keyInput, setKeyInput] = useState("");
  const [questions, setQuestions] = useState<QuestionRecord[]>([]);
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [query, setQuery] = useState("");
  const [view, setView] = useState<QuestionView>("active");
  const [statusFilter, setStatusFilter] = useState<"all" | "draft" | "ready">("all");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function loadQuestions(key: string) {
    if (!key) return false;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/questions", {
        headers: { "x-question-bank-key": key },
        cache: "no-store",
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not load Question Bank.");
      setQuestions(result.questions ?? []);
      return true;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load Question Bank.");
      return false;
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const saved = localStorage.getItem(ADMIN_KEY_STORAGE);
      if (!saved) return;
      setAdminKey(saved);
      setKeyInput(saved);
      void loadQuestions(saved);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  async function unlock(event: FormEvent) {
    event.preventDefault();
    const key = keyInput.trim();
    if (!key) return;
    const ok = await loadQuestions(key);
    if (ok) {
      localStorage.setItem(ADMIN_KEY_STORAGE, key);
      setAdminKey(key);
    }
  }

  const activeCount = useMemo(() => questions.filter((question) => question.status !== "archived").length, [questions]);
  const archivedCount = questions.length - activeCount;
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return questions.filter((question) => {
      if (view === "archive") {
        if (question.status !== "archived") return false;
      } else {
        if (question.status === "archived") return false;
        if (statusFilter !== "all" && question.status !== statusFilter) return false;
      }
      if (!needle) return true;
      const haystack = [
        question.prompt,
        question.answer,
        question.category,
        question.tags.join(" "),
        question.sourceLabel,
      ].filter(Boolean).join(" ").toLowerCase();
      return haystack.includes(needle);
    });
  }, [questions, query, statusFilter, view]);

  async function saveEditor(nextEditor = editor) {
    if (!nextEditor || !adminKey) return false;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      if (!nextEditor.answer.trim()) throw new Error("Answer is required.");
      if (!nextEditor.prompt.trim() && nextEditor.assets.length === 0) {
        throw new Error("Add question text or at least one image.");
      }

      const form = new FormData();
      const assets = nextEditor.assets.map((asset, index) => {
        if (asset.kind === "existing") {
          return {
            kind: "existing",
            storagePath: asset.storagePath,
            mimeType: asset.mimeType,
            altText: asset.altText,
            caption: asset.caption,
            width: asset.width,
            height: asset.height,
          };
        }
        const uploadKey = `image-${index}-${asset.clientId}`;
        form.append(uploadKey, asset.file);
        return {
          kind: "new",
          uploadKey,
          altText: asset.altText,
          caption: asset.caption,
        };
      });

      form.append("payload", JSON.stringify({
        id: nextEditor.id ?? undefined,
        prompt: nextEditor.prompt,
        answer: nextEditor.answer,
        answerVariants: nextEditor.answerVariants.split("\n").map((value) => value.trim()).filter(Boolean),
        explanation: nextEditor.explanation,
        hostNotes: nextEditor.hostNotes,
        category: nextEditor.category,
        difficulty: nextEditor.difficulty ? Number(nextEditor.difficulty) : null,
        sourceLabel: nextEditor.sourceLabel,
        sourceUrl: nextEditor.sourceUrl,
        status: nextEditor.status,
        hints: nextEditor.hints,
        tags: nextEditor.tags.split(",").map((value) => value.trim()).filter(Boolean),
        assets,
      }));

      const response = await fetch("/api/questions", {
        method: "POST",
        headers: { "x-question-bank-key": adminKey },
        body: form,
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not save question.");
      await loadQuestions(adminKey);
      setEditor(null);
      setNotice("Question saved.");
      return true;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save question.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function quickStatus(question: QuestionRecord, status: QuestionStatus) {
    const draft = editorFromRecord(question);
    draft.status = status;
    const saved = await saveEditor(draft);
    if (saved) setNotice(status === "archived" ? "Question moved to Archive." : "Question restored to Questions.");
  }

  async function deleteQuestion(question: QuestionRecord) {
    if (!adminKey || busy || question.status !== "archived") return;
    const confirmed = window.confirm(
      `Permanently delete “${questionLabel(question)}”? This cannot be undone. Played-question snapshots are kept.`,
    );
    if (!confirmed) return;

    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch(`/api/questions/${question.id}`, {
        method: "DELETE",
        headers: { "x-question-bank-key": adminKey },
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not delete question.");
      setQuestions((current) => current.filter((item) => item.id !== question.id));
      setNotice("Question permanently deleted.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not delete question.");
    } finally {
      setBusy(false);
    }
  }

  function addImages(files: FileList | null) {
    if (!files || !editor) return;
    const additions: NewAsset[] = Array.from(files).map((file) => ({
      kind: "new",
      clientId: crypto.randomUUID(),
      file,
      altText: "",
      caption: "",
      previewUrl: URL.createObjectURL(file),
    }));
    setEditor({ ...editor, assets: [...editor.assets, ...additions] });
  }

  if (!adminKey) {
    return (
      <main className="stack narrow">
        <div>
          <p className="eyebrow">Content admin</p>
          <h1>Question Bank</h1>
          <p className="muted">Enter the private owner key. It is stored only on this browser for future edits.</p>
        </div>
        <form className="card stack" onSubmit={unlock}>
          <label className="field">
            <span>Admin key</span>
            <input type="password" value={keyInput} onChange={(event) => setKeyInput(event.target.value)} autoComplete="current-password" />
          </label>
          <button className="primary" disabled={loading || !keyInput.trim()}>{loading ? "Checking..." : "Open Question Bank"}</button>
          {error ? <p className="error">{error}</p> : null}
        </form>
      </main>
    );
  }

  if (editor) {
    return (
      <main className="stack question-editor-shell">
        <div className="split-heading">
          <div>
            <p className="eyebrow">Question Bank</p>
            <h1>{editor.id ? "Edit question" : "New question"}</h1>
            <p className="muted">Text is optional when at least one image is present. The answer is always required.</p>
          </div>
          <button className="secondary" onClick={() => setEditor(null)}>Back to list</button>
        </div>

        <section className="card stack">
          <label className="field">
            <span>Question / prompt</span>
            <textarea rows={4} value={editor.prompt} onChange={(event) => setEditor({ ...editor, prompt: event.target.value })} placeholder="Why did...? Leave empty for an image-led question." />
          </label>

          <div className="split-heading">
            <div><h2>Images</h2><p className="muted compact">JPG, PNG, WEBP or GIF. Up to 5 MB each. Order is preserved in the game.</p></div>
            <label className="upload-button">
              Add images
              <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple onChange={(event) => addImages(event.target.files)} />
            </label>
          </div>
          <div className="question-assets">
            {editor.assets.map((asset, index) => (
              <article className="question-asset" key={asset.kind === "existing" ? asset.storagePath : asset.clientId}>
                <div className="question-image-frame">
                  <Image src={asset.previewUrl ?? "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs="} alt={asset.altText || `Question image ${index + 1}`} width={240} height={150} unoptimized />
                </div>
                <div className="stack asset-fields">
                  <strong>Image {index + 1}</strong>
                  <input value={asset.altText} maxLength={300} placeholder="Alt text (optional)" onChange={(event) => {
                    const assets = [...editor.assets];
                    assets[index] = { ...asset, altText: event.target.value } as EditorAsset;
                    setEditor({ ...editor, assets });
                  }} />
                  <input value={asset.caption} maxLength={500} placeholder="Caption (optional)" onChange={(event) => {
                    const assets = [...editor.assets];
                    assets[index] = { ...asset, caption: event.target.value } as EditorAsset;
                    setEditor({ ...editor, assets });
                  }} />
                  <div className="mini-actions">
                    <button type="button" className="secondary" disabled={index === 0} onClick={() => setEditor({ ...editor, assets: moveItem(editor.assets, index, -1) })}>Up</button>
                    <button type="button" className="secondary" disabled={index === editor.assets.length - 1} onClick={() => setEditor({ ...editor, assets: moveItem(editor.assets, index, 1) })}>Down</button>
                    <button type="button" className="secondary" onClick={() => setEditor({ ...editor, assets: editor.assets.filter((_, assetIndex) => assetIndex !== index) })}>Remove</button>
                  </div>
                </div>
              </article>
            ))}
            {editor.assets.length === 0 ? <p className="muted">No images. This can be a text-only question.</p> : null}
          </div>
        </section>

        <section className="card stack">
          <label className="field">
            <span>Answer *</span>
            <textarea rows={3} value={editor.answer} onChange={(event) => setEditor({ ...editor, answer: event.target.value })} />
          </label>
          <label className="field">
            <span>Acceptable answer variants</span>
            <textarea rows={3} value={editor.answerVariants} onChange={(event) => setEditor({ ...editor, answerVariants: event.target.value })} placeholder="One variant per line" />
          </label>
          <label className="field">
            <span>Explanation / reveal</span>
            <textarea rows={4} value={editor.explanation} onChange={(event) => setEditor({ ...editor, explanation: event.target.value })} />
          </label>
          <label className="field">
            <span>Host-only notes</span>
            <textarea rows={3} value={editor.hostNotes} onChange={(event) => setEditor({ ...editor, hostNotes: event.target.value })} />
          </label>
        </section>

        <section className="card stack">
          <div className="split-heading">
            <div><h2>Hints</h2><p className="muted compact">Hints are revealed in this order during the live game.</p></div>
            <button className="secondary" type="button" onClick={() => setEditor({ ...editor, hints: [...editor.hints, ""] })}>Add hint</button>
          </div>
          {editor.hints.map((hint, index) => (
            <div className="hint-row" key={`hint-${index}`}>
              <span className="seat">{index + 1}</span>
              <input value={hint} placeholder={`Hint ${index + 1}`} onChange={(event) => {
                const hints = [...editor.hints];
                hints[index] = event.target.value;
                setEditor({ ...editor, hints });
              }} />
              <div className="mini-actions">
                <button className="secondary" type="button" disabled={index === 0} onClick={() => setEditor({ ...editor, hints: moveItem(editor.hints, index, -1) })}>Up</button>
                <button className="secondary" type="button" disabled={index === editor.hints.length - 1} onClick={() => setEditor({ ...editor, hints: moveItem(editor.hints, index, 1) })}>Down</button>
                <button className="secondary" type="button" onClick={() => setEditor({ ...editor, hints: editor.hints.filter((_, hintIndex) => hintIndex !== index) })}>Remove</button>
              </div>
            </div>
          ))}
        </section>

        <section className="card stack">
          <h2>Metadata</h2>
          <div className="metadata-grid">
            <label className="field"><span>Category</span><input value={editor.category} onChange={(event) => setEditor({ ...editor, category: event.target.value })} /></label>
            <label className="field"><span>Tags</span><input value={editor.tags} onChange={(event) => setEditor({ ...editor, tags: event.target.value })} placeholder="science, history, weird" /></label>
            <label className="field"><span>Difficulty</span><select value={editor.difficulty} onChange={(event) => setEditor({ ...editor, difficulty: event.target.value })}><option value="">Not set</option>{[1,2,3,4,5].map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
            <label className="field"><span>Status</span><select value={editor.status} onChange={(event) => setEditor({ ...editor, status: event.target.value as QuestionStatus })}><option value="draft">Draft</option><option value="ready">Ready</option><option value="archived">Archived</option></select></label>
            <label className="field"><span>Source label</span><input value={editor.sourceLabel} onChange={(event) => setEditor({ ...editor, sourceLabel: event.target.value })} /></label>
            <label className="field"><span>Source URL</span><input type="url" value={editor.sourceUrl} onChange={(event) => setEditor({ ...editor, sourceUrl: event.target.value })} /></label>
          </div>
        </section>

        {error ? <p className="error">{error}</p> : null}
        <div className="editor-footer">
          <button className="secondary" onClick={() => setEditor(null)}>Cancel</button>
          <button className="primary" disabled={busy} onClick={() => void saveEditor()}>{busy ? "Saving..." : "Save question"}</button>
        </div>
      </main>
    );
  }

  return (
    <main className="stack question-bank-shell">
      <div className="split-heading">
        <div>
          <p className="eyebrow">Content admin</p>
          <h1>{view === "archive" ? "Question Archive" : "Question Bank"}</h1>
          <p className="muted">{activeCount} active questions · {archivedCount} archived. Changes here require no code change or deployment.</p>
        </div>
        <div className="question-bank-actions">
          <button className={view === "active" ? "primary" : "secondary"} onClick={() => { setView("active"); setStatusFilter("all"); }}>Questions ({activeCount})</button>
          <button className={view === "archive" ? "primary" : "secondary"} onClick={() => setView("archive")}>Archive ({archivedCount})</button>
          <button className="secondary" onClick={() => void loadQuestions(adminKey)} disabled={loading}>Refresh</button>
          <button className="primary" onClick={() => { setView("active"); setError(null); setNotice(null); setEditor(emptyEditor()); }}>New question</button>
        </div>
      </div>

      <section className="card question-filters">
        <input aria-label="Search questions" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={view === "archive" ? "Search archived questions..." : "Search question, answer, tag..."} />
        {view === "active" ? (
          <select aria-label="Filter status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as "all" | "draft" | "ready")}>
            <option value="all">All active statuses</option>
            <option value="ready">Ready</option>
            <option value="draft">Draft</option>
          </select>
        ) : (
          <select aria-label="Filter status" value="archived" disabled>
            <option value="archived">Archived only</option>
          </select>
        )}
      </section>

      {notice ? <p className="notice">{notice}</p> : null}
      {error ? <p className="error">{error}</p> : null}
      {loading ? <div className="card">Loading...</div> : null}

      <section className="question-list">
        {filtered.map((question) => (
          <article className="card question-card" key={question.id}>
            <div className="question-card-main">
              <div className="question-card-meta">
                <span className={`question-status ${question.status}`}>{statusLabel(question.status)}</span>
                {question.category ? <span>{question.category}</span> : null}
                {question.difficulty ? <span>Difficulty {question.difficulty}</span> : null}
                {question.assets.length ? <span>{question.assets.length} photo{question.assets.length === 1 ? "" : "s"}</span> : null}
                {question.hints.length ? <span>{question.hints.length} hint{question.hints.length === 1 ? "" : "s"}</span> : null}
              </div>
              <h2>{question.prompt || "Image-led question"}</h2>
              <p className="question-answer-preview">Answer: {question.answer}</p>
              {question.tags.length ? <p className="muted compact">{question.tags.join(" · ")}</p> : null}
            </div>
            {question.assets[0]?.previewUrl ? <Image className="question-thumb" src={question.assets[0].previewUrl} alt={question.assets[0].altText ?? "Question preview"} width={180} height={110} unoptimized /> : null}
            <div className="question-card-actions">
              {view === "active" ? (
                <>
                  <button className="secondary" onClick={() => { setError(null); setNotice(null); setEditor(editorFromRecord(question)); }}>Edit</button>
                  <button className="secondary" disabled={busy} onClick={() => void quickStatus(question, "archived")}>Archive</button>
                </>
              ) : (
                <>
                  <button className="secondary" disabled={busy} onClick={() => void quickStatus(question, "draft")}>Restore</button>
                  <button className="secondary" disabled={busy} onClick={() => void deleteQuestion(question)}>Delete permanently</button>
                </>
              )}
            </div>
          </article>
        ))}
        {!loading && filtered.length === 0 ? (
          <div className="card center">
            <p className="muted compact">{view === "archive" ? "No matching archived questions." : "No matching active questions."}</p>
          </div>
        ) : null}
      </section>

      <button className="question-lock" onClick={() => {
        localStorage.removeItem(ADMIN_KEY_STORAGE);
        setAdminKey("");
        setKeyInput("");
        setQuestions([]);
      }}>Lock Question Bank</button>
    </main>
  );
}
