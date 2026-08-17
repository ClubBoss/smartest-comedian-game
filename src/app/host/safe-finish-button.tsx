"use client";

import { useEffect, useState } from "react";

export function SafeFinishButton({
  sessionId,
  busy,
  answerRevealed,
  onFinish,
}: {
  sessionId: string;
  busy: boolean;
  answerRevealed: boolean;
  onFinish: () => Promise<unknown> | void;
}) {
  const [confirmingSessionId, setConfirmingSessionId] = useState<string | null>(null);
  const confirmingEarlyFinish = !answerRevealed && confirmingSessionId === sessionId;

  useEffect(() => {
    if (!confirmingEarlyFinish) return;
    const timeout = window.setTimeout(() => setConfirmingSessionId(null), 5000);
    return () => window.clearTimeout(timeout);
  }, [confirmingEarlyFinish]);

  const finish = () => {
    if (!answerRevealed && !confirmingEarlyFinish) {
      setConfirmingSessionId(sessionId);
      return;
    }
    setConfirmingSessionId(null);
    void onFinish();
  };

  return (
    <button
      className={confirmingEarlyFinish ? "primary" : "secondary"}
      data-host-hotkey="n"
      disabled={busy}
      onClick={finish}
      title={!answerRevealed ? "Finishing before the answer is shown requires a second confirmation." : undefined}
    >
      {confirmingEarlyFinish ? "CONFIRM early finish" : "Finish question"}
    </button>
  );
}
