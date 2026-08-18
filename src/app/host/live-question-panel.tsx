"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import { HostPackControls } from "./host-pack-controls";
import { HostQueueEditor } from "./host-queue-editor";
import { SafeFinishButton } from "./safe-finish-button";

type QuestionRole = "regular" | "qualifier_super" | "team" | "last" | "double_or_nothing" | "tiebreak";

type ReadyQuestion = {
  id: string;
  prompt: string | null;
  category: string | null;
  difficulty: number | null;
};

type QueueItem = {
  id: string;
  questionId: string | null;
  position: number;
  state: "queued" | "played" | "skipped";
  prompt: string;
  category: string | null;
  role: QuestionRole;
};

type PrivateAsset = {
  storagePath: string;
  mimeType: string | null;
  altText: string | null;
  caption: string | null;
  width: number | null;
  height: number | null;
  previewUrl: string | null;
};

type CurrentQuestion = {
  sessionId: string;
  sourceQuestionId: string | null;
  queueItemId: string | null;
  prompt: string | null;
  answer: string;
  answerVariants: string[];
  explanation: string | null;
  hostNotes: string | null;
  hints: string[];
  assets: PrivateAsset[];
  stimulusRevealed: boolean;
  revealedHintCount: number;
  answerRevealed: boolean;
  role: QuestionRole;
};

type AdminState = {
  readyQuestions: ReadyQuestion[];
  queue: QueueItem[];
  current: CurrentQuestion | null;
};

export type QuestionReadiness = {
  readyQuestions: number;
  queued: number;
  current: boolean;
};

function roleLabel(role: QuestionRole) {
  if (role === "qualifier_super") return "СУПЕР · +3";
  if (role === "team") return "КОМАНДНЫЙ";
  if (role === "last") return "ПОСЛЕДНИЙ · +2";
  if (role === "double_or_nothing") return "СУПЕРФИНАЛ · A/B/C";
  if (role === "tiebreak") return "ТАЙ-БРЕЙК";
  return null;
}

function roleGuidance(role: QuestionRole) {
  if (role === "qualifier_super") return "Buzzer работает как обычно. За правильный ответ нажми +1 три раза. За ошибку можно оставить 0.";
  if (role === "team") return "Все финалисты совещаются 60–90 секунд и дают один общий ответ. Buzzer не используется, личные очки не меняются.";
  if (role === "last") return "Последний соревновательный вопрос Финала. Buzzer работает как обычно. За правильный ответ нажми +1 два раза.";
  if (role === "double_or_nothing") return "Только победитель. Buzzer не используется. Покажи три варианта A/B/C; все дополнительные условия ведущий проговаривает устно — приложение ничего отдельно не считает.";
  if (role === "tiebreak") return "Резервный sudden-death вопрос. Используй только при ничьей; победитель этого вопроса проходит дальше.";
  return null;
}

export function LiveQuestionPanel({
  code,
  hostToken,
  onRoomRefresh,
  gameMode = false,
  onReadinessChange,
}: {
  code: string;
  hostToken: string;
  onRoomRefresh: () => Promise<unknown>;
  gameMode?: boolean;
  onReadinessChange?: (value: QuestionReadiness) => void;
}) {
  const [state, setState] = useState<AdminState | null>(null);
  const [selectedQuestionId, setSelectedQuestionId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const response = await fetch(`/api/rooms/${code}/questions`, {
      headers: { "x-host-token": hostToken },
      cache: "no-store",
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error ?? "Could not load live questions.");
    setState(result as AdminState);
  }, [code, hostToken]);

  useEffect(() => {
    let active = true;
    const initial = window.setTimeout(() => {
      void load().catch((caught) => {
        if (active) setError(caught instanceof Error ? caught.message : "Could not load live questions.");
      });
    }, 0);
    const interval = window.setInterval(() => {
      void load().catch(() => undefined);
    }, 4000);
    return () => {
      active = false;
      window.clearTimeout(initial);
      window.clearInterval(interval);
    };
  }, [load]);

  useEffect(() => {
    const refresh = () => void load().catch(() => undefined);
    window.addEventListener("smartest-live-question-refresh", refresh);
    return () => window.removeEventListener("smartest-live-question-refresh", refresh);
  }, [load]);

  const queued = useMemo(
    () => (state?.queue ?? []).filter(
      (item) => item.state === "queued" && item.id !== state?.current?.queueItemId,
    ),
    [state?.current?.queueItemId, state?.queue],
  );

  useEffect(() => {
    onReadinessChange?.({
      readyQuestions: state?.readyQuestions.length ?? 0,
      queued: queued.length,
      current: Boolean(state?.current),
    });
  }, [onReadinessChange, queued.length, state?.current, state?.readyQuestions.length]);

  async function act(action: string, extra: object = {}) {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/rooms/${code}/questions/action`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-host-token": hostToken,
        },
        body: JSON.stringify({ action, ...extra }),
      });
      const result = await response.json();
      if (!response.ok) {
        const messages: Record<string, string> = {
          ERR_QUESTION_ACTIVE: "Finish the current question before starting another one.",
          ERR_QUESTION_NOT_READY: "Only Ready questions can be used in a game.",
          ERR_QUEUE_ITEM_NOT_FOUND: "That queue item is no longer available.",
          ERR_QUEUE_EMPTY: "The queue is empty.",
          ERR_NO_MORE_HINTS: "All hints are already revealed.",
          ERR_STIMULUS_HIDDEN: "Show the question before this action.",
          ERR_NO_ACTIVE_QUESTION: "There is no active question.",
        };
        throw new Error(messages[result.error] ?? result.error ?? "Question action failed.");
      }
      await Promise.all([load(), onRoomRefresh()]);
      return true;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Question action failed.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  if (!state) {
    return <section className="card"><p className="muted compact">Loading live question controller...</p>{error ? <p className="error">{error}</p> : null}</section>;
  }

  if (state.current) {
    const current = state.current;
    const canRevealHint = current.stimulusRevealed && current.revealedHintCount < current.hints.length && !current.answerRevealed;
    const specialLabel = roleLabel(current.role);
    const guidance = roleGuidance(current.role);
    return (
      <section className="card stack live-question-host">
        <div className="split-heading">
          <div>
            <p className="eyebrow">Live question</p>
            <h2>{current.prompt || "Image-led question"}</h2>
          </div>
          <div className="host-actions">
            {specialLabel ? <span className="status-pill live">{specialLabel}</span> : null}
            <span className="status-pill">
              {current.answerRevealed ? "ANSWER SHOWN" : current.stimulusRevealed ? "VISIBLE" : "PRELOADED · PRIVATE"}
            </span>
          </div>
        </div>

        {guidance ? (
          <div className="notice">
            <strong>Как провести этот вопрос:</strong> {guidance}
          </div>
        ) : null}

        {current.assets.length > 0 ? (
          <div className="host-question-images">
            {current.assets.map((asset, index) => asset.previewUrl ? (
              <figure key={`${asset.storagePath}-${index}`}>
                <Image src={asset.previewUrl} alt={asset.altText ?? `Question image ${index + 1}`} width={320} height={200} unoptimized />
                {asset.caption ? <figcaption>{asset.caption}</figcaption> : null}
              </figure>
            ) : null)}
          </div>
        ) : null}

        <div className="host-private-answer">
          <p className="eyebrow">Host only · answer</p>
          <strong>{current.answer}</strong>
          {current.answerVariants.length > 0 ? <p>Accept: {current.answerVariants.join(" · ")}</p> : null}
          {current.explanation ? <p>{current.explanation}</p> : null}
          {current.hostNotes ? <p className="host-note">Host note: {current.hostNotes}</p> : null}
        </div>

        {current.hints.length > 0 ? (
          <div className="stack host-hints">
            <strong>Hints</strong>
            {current.hints.map((hint, index) => (
              <div className={index < current.revealedHintCount ? "host-hint revealed" : "host-hint"} key={`${index}-${hint}`}>
                <span>{index + 1}</span><p>{hint}</p><em>{index < current.revealedHintCount ? "shown" : "private"}</em>
              </div>
            ))}
          </div>
        ) : null}

        <div className="live-question-actions">
          <button className={`primary ${!current.stimulusRevealed ? "next-action" : ""}`} data-host-hotkey="show" disabled={busy || current.stimulusRevealed} onClick={() => void act("reveal-stimulus")}>Show question</button>
          <button className="secondary" data-host-hotkey="h" disabled={busy || !canRevealHint} onClick={() => void act("reveal-hint")}>Reveal next hint</button>
          <button className="secondary" data-host-hotkey="a" disabled={busy || current.answerRevealed || !current.stimulusRevealed} onClick={() => void act("reveal-answer")}>Reveal answer</button>
          <SafeFinishButton
            sessionId={current.sessionId}
            busy={busy}
            answerRevealed={current.answerRevealed}
            onFinish={() => act("finish")}
          />
        </div>

        {gameMode ? (
          <HostQueueEditor
            readyQuestions={state.readyQuestions}
            queued={queued}
            selectedQuestionId={selectedQuestionId}
            onSelectQuestion={setSelectedQuestionId}
            busy={busy}
            currentActive
            act={act}
          />
        ) : null}

        {!current.stimulusRevealed ? <p className="muted compact">TV and players cannot see the prompt, photos, hints or answer yet. Buzzer is intentionally blocked until Show question.</p> : null}
        {(current.role === "team" || current.role === "double_or_nothing") && current.stimulusRevealed ? <p className="notice">Этот вопрос проводится без buzzer.</p> : null}
        {error ? <p className="error">{error}</p> : null}
      </section>
    );
  }

  if (gameMode) {
    return (
      <section className="card stack live-question-host">
        <HostPackControls code={code} hostToken={hostToken} onRoomRefresh={onRoomRefresh} />
        <div className="compact-question-queue">
          <div>
            <p className="eyebrow">Next question</p>
            <h2>{queued[0]?.prompt || (queued.length > 0 ? "Image-led question" : "Queue is empty")}</h2>
            <p className="muted compact">{queued.length} queued{queued[0] && roleLabel(queued[0].role) ? ` · ${roleLabel(queued[0].role)}` : ""}</p>
          </div>
          <button className="primary next-action" data-host-hotkey="n" disabled={busy || queued.length === 0} onClick={() => void act("start-next")}>Preload next</button>
        </div>
        <HostQueueEditor
          readyQuestions={state.readyQuestions}
          queued={queued}
          selectedQuestionId={selectedQuestionId}
          onSelectQuestion={setSelectedQuestionId}
          busy={busy}
          currentActive={false}
          defaultOpen
          act={act}
        />
        {error ? <p className="error">{error}</p> : null}
      </section>
    );
  }

  return (
    <section className="card stack live-question-host">
      <div className="split-heading">
        <div>
          <p className="eyebrow">Questions</p>
          <h2>Prepare the next question</h2>
        </div>
        <button className="secondary" data-host-hotkey="n" disabled={busy || queued.length === 0} onClick={() => void act("start-next")}>Preload next queued</button>
      </div>

      <HostPackControls code={code} hostToken={hostToken} onRoomRefresh={onRoomRefresh} />

      <div className="question-picker-row">
        <select value={selectedQuestionId} onChange={(event) => setSelectedQuestionId(event.target.value)}>
          <option value="">Choose a Ready question...</option>
          {state.readyQuestions.map((question) => (
            <option key={question.id} value={question.id}>
              {question.prompt || "Image-led question"}{question.category ? ` · ${question.category}` : ""}
            </option>
          ))}
        </select>
        <button className="secondary" disabled={busy || !selectedQuestionId} onClick={() => void act("queue", { questionId: selectedQuestionId })}>Add to queue</button>
        <button className="primary" disabled={busy || !selectedQuestionId} onClick={() => void act("start", { questionId: selectedQuestionId })}>Preload now</button>
      </div>

      <div className="stack">
        <strong>Queue</strong>
        {queued.length === 0 ? <p className="muted compact">Queue is empty. You can still preload any Ready question directly.</p> : null}
        {queued.map((item, index) => (
          <div className="queue-row" key={item.id}>
            <span className="seat">{index + 1}</span>
            <div>
              <strong>{item.prompt || "Image-led question"}</strong>
              <p className="muted compact">{roleLabel(item.role) ?? item.category ?? "Обычный вопрос"}</p>
            </div>
            <div className="mini-actions">
              <button className="secondary" disabled={busy || index === 0} onClick={() => void act("move", { queueItemId: item.id, direction: -1 })}>Up</button>
              <button className="secondary" disabled={busy || index === queued.length - 1} onClick={() => void act("move", { queueItemId: item.id, direction: 1 })}>Down</button>
              <button className="secondary" disabled={busy || !item.questionId} onClick={() => void act("start", { questionId: item.questionId, queueItemId: item.id })}>Preload</button>
              <button className="secondary" disabled={busy} onClick={() => void act("skip", { queueItemId: item.id })}>Skip</button>
            </div>
          </div>
        ))}
      </div>
      {error ? <p className="error">{error}</p> : null}
    </section>
  );
}
