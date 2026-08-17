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
  const [confirmingEarlyFinish, setConfirmingEarlyFinish] = useState(false);

  useEffect(() => {
    setConfirmingEarlyFinish(false);
  }, [sessionId, answerRevealed]);

  useEffect(() => {
    if (!confirmingEarlyFinish) return;
    const timeout = window.setTimeout(() => setConfirmingEarlyFinish(false), 5000);
    return () => window.clearTimeout(timeout);
  }, [confirmingEarlyFinish]);

  const finish = () => {
    if (!answerRevealed && !confirmingEarlyFinish) {
      setConfirmingEarlyFinish(true);
      return;
    }
    setConfirmingEarlyFinish(false);
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
