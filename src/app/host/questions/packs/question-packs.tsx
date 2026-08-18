"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";

const ADMIN_KEY_STORAGE = "smartest-question-bank-admin-key";

const ROLE_OPTIONS = [
  { value: "regular", label: "Обычный вопрос", help: "Стандартный вопрос: обычно +1 / 0 / -1." },
  { value: "qualifier_super", label: "Супер-вопрос · +3", help: "Сложный вопрос в конце Игры 1 или Игры 2. Правильный ответ = +3, ошибка = 0." },
  { value: "team", label: "Командный вопрос", help: "Финалисты совещаются вместе. Правильный ответ увеличивает приз с 10 до 12 AZN." },
  { value: "last", label: "Последний вопрос · +2", help: "Последний соревновательный вопрос финала. Правильный ответ = +2." },
  { value: "double_or_nothing", label: "Удвоение приза", help: "Финальный A/B/C вопрос только для победителя. Обычный buzzer не используется." },
  { value: "tiebreak", label: "Тай-брейк", help: "Резервный вопрос только если нужно разрулить ничью." },
] as const;

type QuestionRole = (typeof ROLE_OPTIONS)[number]["value"];
type QuestionRef = { id: string; prompt: string | null; category: string | null; status: string };
type PackItem = { questionId: string; role: QuestionRole };
type LoadedPackItem = PackItem & { correctPoints: number | null; wrongPoints: number | null; question: QuestionRef };
type Pack = { id: string; name: string; description: string | null; questionIds: string[]; questions: QuestionRef[]; items?: LoadedPackItem[] };
type PackPayload = { packs: Pack[]; questions: QuestionRef[]; readyQuestions: QuestionRef[] };

function roleLabel(role: QuestionRole) {
  return ROLE_OPTIONS.find((option) => option.value === role)?.label ?? "Обычный вопрос";
}

export function QuestionPacks() {
  const [adminKey, setAdminKey] = useState("");
  const [keyInput, setKeyInput] = useState("");
  const [data, setData] = useState<PackPayload>({ packs: [], questions: [], readyQuestions: [] });
  const [packId, setPackId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [items, setItems] = useState<PackItem[]>([]);
  const [addQuestionId, setAddQuestionId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function load(key: string) {
    const response = await fetch("/api/question-packs", { headers: { "x-question-bank-key": key }, cache: "no-store" });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error ?? "Не удалось загрузить наборы вопросов.");
    setData(result as PackPayload);
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const saved = localStorage.getItem(ADMIN_KEY_STORAGE);
      if (!saved) return;
      setAdminKey(saved);
      setKeyInput(saved);
      void load(saved).catch((caught) => setError(caught instanceof Error ? caught.message : "Не удалось загрузить наборы вопросов."));
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
      setError(caught instanceof Error ? caught.message : "Неверный ключ или сервис недоступен.");
    }
  }

  function edit(pack: Pack) {
    setPackId(pack.id);
    setName(pack.name);
    setDescription(pack.description ?? "");
    setItems(pack.items?.map((item) => ({ questionId: item.questionId, role: item.role })) ?? pack.questionIds.map((questionId) => ({ questionId, role: "regular" as const })));
    setNotice(null);
    setError(null);
  }

  function reset() {
    setPackId(null);
    setName("");
    setDescription("");
    setItems([]);
    setAddQuestionId("");
    setNotice(null);
    setError(null);
  }

  function move(index: number, delta: -1 | 1) {
    const next = [...items];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setItems(next);
  }

  function setRole(questionId: string, role: QuestionRole) {
    setItems((current) => current.map((item) => item.questionId === questionId ? { ...item, role } : item));
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
        body: JSON.stringify({ id: packId, name, description, items }),
      });
      const result = await response.json();
      if (!response.ok) {
        const messages: Record<string, string> = {
          ERR_QUESTION_NOT_READY: "В наборе есть архивный или недоступный вопрос. Удали или замени его.",
          ERR_PACK_DUPLICATE_QUESTION: "Один и тот же вопрос нельзя добавить в набор дважды.",
          ERR_PACK_ROLE_INVALID: "У одного из вопросов некорректный режим игры.",
        };
        throw new Error(messages[result.error] ?? result.error ?? "Не удалось сохранить набор.");
      }
      setPackId(result.id);
      setNotice("Набор сохранён. Его можно загрузить у ведущего одним нажатием.");
      await load(adminKey);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Не удалось сохранить набор.");
    } finally {
      setBusy(false);
    }
  }

  if (!adminKey) {
    return (
      <main className="stack narrow">
        <div>
          <p className="eyebrow">Наборы для игры</p>
          <h1>Готовые игры</h1>
          <p className="muted">Здесь собираются вопросы в том порядке, в котором ведущий будет их проводить.</p>
        </div>
        <form className="card stack" onSubmit={unlock}>
          <label className="field"><span>Ключ владельца</span><input type="password" value={keyInput} onChange={(event) => setKeyInput(event.target.value)} /></label>
          <button className="primary">Открыть редактор</button>
          {error ? <p className="error">{error}</p> : null}
        </form>
      </main>
    );
  }

  const selectedQuestions = items.map((item) => ({
    ...item,
    question: data.questions.find((question) => question.id === item.questionId) ?? { id: item.questionId, prompt: "Недоступный вопрос", category: null, status: "unavailable" },
  }));
  const selectedIds = new Set(items.map((item) => item.questionId));
  const availableQuestions = data.readyQuestions.filter((question) => !selectedIds.has(question.id));
  const hasUnavailable = selectedQuestions.some((item) => item.question.status !== "ready");

  return (
    <main className="stack question-editor-shell">
      <div className="split-heading">
        <div>
          <p className="eyebrow">Наборы для игры</p>
          <h1>Готовые игры</h1>
          <p className="muted">Собери отдельные пакеты «Игра 1», «Игра 2» и «Финал». Ведущему останется только загрузить нужный пакет.</p>
        </div>
        <div className="host-actions"><button className="secondary" onClick={reset}>Новый набор</button><Link className="secondary" href="/host/questions">Банк вопросов</Link></div>
      </div>

      <div className="lobby-grid">
        <section className="card stack">
          <h2>Сохранённые игры</h2>
          {data.packs.length === 0 ? <p className="muted">Пока нет ни одного набора.</p> : null}
          <div className="player-list">
            {data.packs.map((pack) => (
              <button className="player-row" key={pack.id} onClick={() => edit(pack)}>
                <span><strong>{pack.name}</strong><span className="muted compact">{pack.questionIds.length} вопросов</span></span>
                <span>Открыть</span>
              </button>
            ))}
          </div>
        </section>

        <section className="card stack">
          <div><p className="eyebrow">{packId ? "Редактирование" : "Новый набор"}</p><h2>{name || "Без названия"}</h2></div>
          <label className="field"><span>Название</span><input maxLength={120} value={name} onChange={(event) => setName(event.target.value)} placeholder="Например: Игра 1 · Пилот" /></label>
          <label className="field"><span>Заметка для ведущего</span><textarea rows={3} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Например: первая квалификационная игра, 5 обычных + супер-вопрос" /></label>

          <div className="question-picker-row">
            <select value={addQuestionId} onChange={(event) => setAddQuestionId(event.target.value)}>
              <option value="">Добавить готовый вопрос...</option>
              {availableQuestions.map((question) => <option key={question.id} value={question.id}>{question.prompt || "Фото-вопрос"}{question.category ? ` · ${question.category}` : ""}</option>)}
            </select>
            <button className="secondary" disabled={!addQuestionId} onClick={() => {
              if (!addQuestionId) return;
              setItems((current) => [...current, { questionId: addQuestionId, role: "regular" }]);
              setAddQuestionId("");
            }}>Добавить</button>
          </div>

          {hasUnavailable ? <p className="error">В наборе есть архивный или недоступный вопрос. Удали или замени его перед сохранением.</p> : null}

          <div className="stack">
            {selectedQuestions.length === 0 ? <p className="muted compact">Добавь вопросы. Порядок здесь станет порядком игры.</p> : null}
            {selectedQuestions.map((item, index) => {
              const role = ROLE_OPTIONS.find((option) => option.value === item.role) ?? ROLE_OPTIONS[0];
              return (
                <div className="card compact-card stack" key={item.questionId}>
                  <div className="split-heading">
                    <div>
                      <p className="eyebrow">Вопрос {index + 1}</p>
                      <strong>{item.question.prompt || "Фото-вопрос"}</strong>
                      {item.question.category ? <p className="muted compact">{item.question.category}</p> : null}
                    </div>
                    <span className="status-pill">{roleLabel(item.role)}</span>
                  </div>

                  <label className="field">
                    <span>Как этот вопрос работает в игре</span>
                    <select value={item.role} onChange={(event) => setRole(item.questionId, event.target.value as QuestionRole)}>
                      {ROLE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </select>
                    <small className="muted">{role.help}</small>
                  </label>

                  {item.question.status !== "ready" ? <p className="error compact">Статус: {item.question.status}</p> : null}
                  <div className="mini-actions">
                    <button className="secondary" disabled={index === 0} onClick={() => move(index, -1)}>Выше</button>
                    <button className="secondary" disabled={index === selectedQuestions.length - 1} onClick={() => move(index, 1)}>Ниже</button>
                    <button className="secondary" onClick={() => setItems((current) => current.filter((entry) => entry.questionId !== item.questionId))}>Удалить</button>
                  </div>
                </div>
              );
            })}
          </div>

          <button className="primary" disabled={busy || !name.trim() || items.length === 0 || hasUnavailable} onClick={() => void save()}>{busy ? "Сохраняю..." : "Сохранить игру"}</button>
          {notice ? <p className="notice">{notice}</p> : null}
          {error ? <p className="error">{error}</p> : null}
        </section>
      </div>
    </main>
  );
}
