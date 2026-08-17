"use client";

import { BUILTIN_SOUNDS, soundEmoji, soundLabel } from "@/domain/sounds";
import { useEffect, useRef, useState } from "react";

type SoundSetupPlayer = {
  id: string;
  displayName: string;
  seatOrder: number;
  soundType: "builtin" | "custom";
  soundKey: string | null;
};

type RecordingDraft = {
  blob: Blob;
  url: string;
  mimeType: string;
  extension: "webm" | "m4a" | "ogg" | "wav";
};

const MAX_RECORDING_MS = 8_000;
const MAX_SOUND_BYTES = 1_572_864;

function extensionForMime(mimeType: string): RecordingDraft["extension"] {
  const type = mimeType.toLowerCase();
  if (type.includes("mp4") || type.includes("m4a")) return "m4a";
  if (type.includes("ogg")) return "ogg";
  if (type.includes("wav")) return "wav";
  return "webm";
}

function preferredRecordingMimeType() {
  if (typeof MediaRecorder === "undefined") return "";
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/mp4",
    "audio/ogg;codecs=opus",
    "audio/webm",
  ];
  return candidates.find((type) => MediaRecorder.isTypeSupported(type)) ?? "";
}

export function HostSoundSetup({
  code,
  hostToken,
  players,
  availableSoundKeys,
  onRefresh,
}: {
  code: string;
  hostToken: string;
  players: SoundSetupPlayer[];
  availableSoundKeys: string[];
  onRefresh: () => Promise<void>;
}) {
  const [drafts, setDrafts] = useState<Record<string, RecordingDraft>>({});
  const [recordingPlayerId, setRecordingPlayerId] = useState<string | null>(null);
  const [busyPlayerId, setBusyPlayerId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const stopTimerRef = useRef<number | null>(null);
  const draftUrlsRef = useRef(new Set<string>());

  function stopStream() {
    if (stopTimerRef.current) window.clearTimeout(stopTimerRef.current);
    stopTimerRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    recorderRef.current = null;
  }

  function replaceDraft(playerId: string, blob: Blob, mimeType: string) {
    if (blob.size < 1) {
      setError("The recording was empty. Try again and speak closer to the microphone.");
      return;
    }
    if (blob.size > MAX_SOUND_BYTES) {
      setError("The recording is larger than 1.5 MB. Record a shorter sound.");
      return;
    }
    const url = URL.createObjectURL(blob);
    draftUrlsRef.current.add(url);
    setDrafts((current) => {
      const previous = current[playerId];
      if (previous) {
        URL.revokeObjectURL(previous.url);
        draftUrlsRef.current.delete(previous.url);
      }
      return {
        ...current,
        [playerId]: {
          blob,
          url,
          mimeType,
          extension: extensionForMime(mimeType),
        },
      };
    });
  }

  function discardDraft(playerId: string) {
    setDrafts((current) => {
      const draft = current[playerId];
      if (!draft) return current;
      URL.revokeObjectURL(draft.url);
      draftUrlsRef.current.delete(draft.url);
      const next = { ...current };
      delete next[playerId];
      return next;
    });
  }

  useEffect(() => () => {
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
    stopStream();
    for (const url of draftUrlsRef.current) URL.revokeObjectURL(url);
    draftUrlsRef.current.clear();
  }, []);

  async function startRecording(playerId: string) {
    setError(null);
    if (recordingPlayerId) return;
    if (typeof MediaRecorder === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setError("This browser cannot record microphone audio. Use current Chrome, Edge, or Safari, or upload a file instead.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = preferredRecordingMimeType();
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      const chunks: Blob[] = [];
      streamRef.current = stream;
      recorderRef.current = recorder;
      setRecordingPlayerId(playerId);

      recorder.addEventListener("dataavailable", (event) => {
        if (event.data.size > 0) chunks.push(event.data);
      });
      recorder.addEventListener("stop", () => {
        const actualType = recorder.mimeType || chunks[0]?.type || mimeType || "audio/webm";
        replaceDraft(playerId, new Blob(chunks, { type: actualType }), actualType);
        stopStream();
        setRecordingPlayerId(null);
      }, { once: true });
      recorder.addEventListener("error", () => {
        setError("Microphone recording failed. Check browser microphone permission and try again.");
        stopStream();
        setRecordingPlayerId(null);
      }, { once: true });

      recorder.start();
      stopTimerRef.current = window.setTimeout(() => {
        if (recorder.state === "recording") recorder.stop();
      }, MAX_RECORDING_MS);
    } catch {
      stopStream();
      setRecordingPlayerId(null);
      setError("Microphone permission was not granted. Allow microphone access for the host page and try again.");
    }
  }

  function stopRecording() {
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
  }

  async function assignCustom(playerId: string, draft: RecordingDraft) {
    setBusyPlayerId(playerId);
    setError(null);
    const form = new FormData();
    form.append("sound", new File(
      [draft.blob],
      `host-recording-${playerId}.${draft.extension}`,
      { type: draft.mimeType },
    ));
    try {
      const response = await fetch(`/api/rooms/${code}/players/${playerId}/sound`, {
        method: "POST",
        headers: { "x-host-token": hostToken },
        body: form,
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not assign custom sound.");
      discardDraft(playerId);
      await onRefresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not assign custom sound.");
    } finally {
      setBusyPlayerId(null);
    }
  }

  async function assignBuiltin(playerId: string, soundKey: string) {
    if (!soundKey) return;
    setBusyPlayerId(playerId);
    setError(null);
    try {
      const response = await fetch(`/api/rooms/${code}/players/${playerId}/sound`, {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          "x-host-token": hostToken,
        },
        body: JSON.stringify({ soundKey }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not assign built-in sound.");
      await onRefresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not assign built-in sound.");
    } finally {
      setBusyPlayerId(null);
    }
  }

  async function testAssignedSound(playerId: string) {
    setBusyPlayerId(playerId);
    setError(null);
    try {
      const response = await fetch(`/api/rooms/${code}/players/${playerId}/sound-test`, {
        method: "POST",
        headers: { "x-host-token": hostToken },
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not test sound on TV.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not test sound on TV.");
    } finally {
      setBusyPlayerId(null);
    }
  }

  function addUploadedDraft(playerId: string, file: File) {
    setError(null);
    if (file.size > MAX_SOUND_BYTES) {
      setError("Custom sound must be at most 1.5 MB.");
      return;
    }
    replaceDraft(playerId, file, file.type || "application/octet-stream");
  }

  const customCount = players.filter((player) => player.soundType === "custom").length;

  return (
    <section className="card stack host-sound-setup" aria-label="Host sound setup">
      <div className="split-heading">
        <div>
          <p className="eyebrow">Sound check</p>
          <h2>Give everyone a buzzer personality</h2>
          <p className="muted compact">During introductions, invent a quick prompt — for example: “Make a sound like you are extremely surprised.” Record the answer on this computer, preview it, then assign it.</p>
        </div>
        <span className="status-pill">{customCount}/{players.length} custom</span>
      </div>

      {players.length === 0 ? <p className="muted">Players will appear here after they join.</p> : null}
      <div className="host-sound-player-list">
        {players.map((player) => {
          const draft = drafts[player.id];
          const recording = recordingPlayerId === player.id;
          const busy = busyPlayerId === player.id;
          return (
            <article className="host-sound-player" key={player.id}>
              <div className="host-sound-player-heading">
                <span className="seat">{player.seatOrder}</span>
                <div>
                  <strong>{player.displayName}</strong>
                  <small>{player.soundType === "custom" ? "🎙 Custom recording" : `${soundEmoji(player.soundKey)} ${soundLabel(player.soundKey)}`}</small>
                </div>
              </div>

              <div className="host-sound-controls">
                <select
                  aria-label={`Premade sound for ${player.displayName}`}
                  value={player.soundType === "builtin" ? player.soundKey ?? "" : ""}
                  disabled={busy || recording}
                  onChange={(event) => void assignBuiltin(player.id, event.target.value)}
                >
                  <option value="">{player.soundType === "custom" ? "Custom sound active" : "Choose premade…"}</option>
                  {BUILTIN_SOUNDS.map((sound) => {
                    const available = availableSoundKeys.includes(sound.key) || player.soundKey === sound.key;
                    return <option key={sound.key} value={sound.key} disabled={!available}>{sound.emoji} {sound.label}{available ? "" : " — taken"}</option>;
                  })}
                </select>
                <button className="secondary" disabled={busy || recording} onClick={() => void testAssignedSound(player.id)}>Test on TV</button>
                {recording ? (
                  <button className="primary recording-button" onClick={stopRecording}>■ Stop recording</button>
                ) : (
                  <button className="primary" disabled={Boolean(recordingPlayerId) || busy} onClick={() => void startRecording(player.id)}>● Record custom</button>
                )}
                <label className="upload-button host-sound-upload">
                  Upload
                  <input
                    type="file"
                    accept="audio/*,.m4a,.mp3,.wav,.ogg,.webm"
                    disabled={busy || recording}
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) addUploadedDraft(player.id, file);
                      event.currentTarget.value = "";
                    }}
                  />
                </label>
              </div>

              {recording ? <p className="host-recording-live" role="status">● Recording {player.displayName} — stops automatically after 8 seconds</p> : null}
              {draft ? (
                <div className="host-recording-draft">
                  <strong>New sound ready</strong>
                  <button className="secondary" onClick={() => void new Audio(draft.url).play()}>▶ Preview</button>
                  <button className="primary" disabled={busy || Boolean(recordingPlayerId)} onClick={() => void assignCustom(player.id, draft)}>{busy ? "Assigning…" : "Assign"}</button>
                  <button className="secondary" disabled={busy || Boolean(recordingPlayerId)} onClick={() => void startRecording(player.id)}>Re-record</button>
                  <button className="secondary" disabled={busy || recording} onClick={() => discardDraft(player.id)}>Discard</button>
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
      <p className="tiny muted">Recording stays local until you press Assign. Assigning a new custom or premade sound replaces the player’s previous sound.</p>
      {error ? <p className="error">{error}</p> : null}
    </section>
  );
}
