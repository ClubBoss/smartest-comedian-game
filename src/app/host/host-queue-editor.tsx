"use client";

import { useState } from "react";

type ReadyQuestion = {
  id: string;
  prompt: string | null;
  category: string | null;
};

type QueueItem = {
  id: string;
  questionId: string | null;
  prompt: string;
  category: string | null;
};

type QueueAction = (action: string, extra?: object) => Promise<boolean>;

export function HostQueueEditor({
  readyQuestions,
  queued,
  selectedQuestionId,
  onSelectQuestion,
  busy,
  currentActive,
  defaultOpen = false,
  act,
}: {
  readyQuestions: ReadyQuestion[];
  queued: QueueItem[];
  selectedQuestionId: string;
  onSelectQuestion: (questionId: string) => void;
  busy: boolean;
  currentActive: boolean;
  defaultOpen?: boolean;
  act: QueueAction;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <details
      className="game-queue-editor"
      open={open}
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary>
        <strong>Queue controls</strong>
        <span>{queued.length} queued</span>
      </summary>
      <div className="stack game-queue-editor-body">
        <p className="muted compact">
          Reorder, skip or add future questions without leaving Game Mode. The question already live on TV stays frozen; bank edits apply the next time a question starts.
        </p>

        <div className="question-picker-row">
          <select
            aria-label="Add question to live queue"
            value={selectedQuestionId}
            onChange={(event) => onSelectQuestion(event.target.value)}
          >
            <option value="">Choose a Ready question...</option>
            {readyQuestions.map((question) => (
              <option key={question.id} value={question.id}>
                {question.prompt || "Image-led question"}{question.category ? ` · ${question.category}` : ""}
              </option>
            ))}
          </select>
          <button
            className="secondary"
            disabled={busy || !selectedQuestionId}
            onClick={() => void act("queue", { questionId: selectedQuestionId })}
          >
            Add to queue
          </button>
          <a className="secondary queue-bank-link" href="/host/questions" target="_blank" rel="noreferrer">
            Edit question bank ↗
          </a>
        </div>

        <div className="stack game-queue-list">
          {queued.length === 0 ? <p className="muted compact">Queue is empty.</p> : null}
          {queued.map((item, index) => (
            <div className="queue-row" key={item.id}>
              <span className="seat">{index + 1}</span>
              <div>
                <strong>{item.prompt || "Image-led question"}</strong>
                {item.category ? <p className="muted compact">{item.category}</p> : null}
              </div>
              <div className="mini-actions">
                <button
                  className="secondary"
                  aria-label={`Move ${item.prompt || "question"} up`}
                  disabled={busy || index === 0}
                  onClick={() => void act("move", { queueItemId: item.id, direction: -1 })}
                >
                  Up
                </button>
                <button
                  className="secondary"
                  aria-label={`Move ${item.prompt || "question"} down`}
                  disabled={busy || index === queued.length - 1}
                  onClick={() => void act("move", { queueItemId: item.id, direction: 1 })}
                >
                  Down
                </button>
                <button
                  className="secondary"
                  disabled={busy || currentActive || !item.questionId}
                  onClick={() => void act("start", { questionId: item.questionId, queueItemId: item.id })}
                >
                  Preload
                </button>
                <button
                  className="secondary"
                  disabled={busy}
                  onClick={() => void act("skip", { queueItemId: item.id })}
                >
                  Skip
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </details>
  );
}
