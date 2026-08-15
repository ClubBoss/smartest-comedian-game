"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";
import { HostLobby } from "./host-lobby";

const CURRENT_ROOM_KEY = "smartest-host-current-room";
const HOST_TOKEN_PREFIX = "smartest-host-";
const ROOM_HISTORY_KEY = "smartest-host-room-history-v1";
const MAX_SAVED_ROOMS = 12;

type SavedRoom = {
  code: string;
  lastUsedAt: number;
};

function readHistory(): SavedRoom[] {
  try {
    const raw = localStorage.getItem(ROOM_HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((item) => {
      if (!item || typeof item !== "object") return [];
      const candidate = item as Partial<SavedRoom>;
      if (typeof candidate.code !== "string" || !candidate.code.trim()) return [];
      return [{ code: candidate.code.trim().toUpperCase(), lastUsedAt: Number(candidate.lastUsedAt) || 0 }];
    });
  } catch {
    return [];
  }
}

function nextRecency(rooms: SavedRoom[]): number {
  return rooms.reduce((maximum, room) => Math.max(maximum, room.lastUsedAt), 0) + 1;
}

function discoverHostRooms(): string[] {
  const codes: string[] = [];
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (!key?.startsWith(HOST_TOKEN_PREFIX)) continue;
    if (key === CURRENT_ROOM_KEY || key === ROOM_HISTORY_KEY) continue;
    const code = key.slice(HOST_TOKEN_PREFIX.length).trim().toUpperCase();
    if (!/^[A-Z0-9]{6}$/.test(code) || !localStorage.getItem(key)) continue;
    codes.push(code);
  }
  return codes;
}

function reconcileHistory(markCurrent: boolean): { rooms: SavedRoom[]; currentCode: string | null } {
  const currentCode = localStorage.getItem(CURRENT_ROOM_KEY)?.trim().toUpperCase() || null;
  const byCode = new Map<string, SavedRoom>();

  for (const room of readHistory()) {
    if (/^[A-Z0-9]{6}$/.test(room.code) && localStorage.getItem(`${HOST_TOKEN_PREFIX}${room.code}`)) {
      byCode.set(room.code, room);
    }
  }
  for (const code of discoverHostRooms()) {
    if (!byCode.has(code)) byCode.set(code, { code, lastUsedAt: 0 });
  }
  if (currentCode && localStorage.getItem(`${HOST_TOKEN_PREFIX}${currentCode}`)) {
    const existing = byCode.get(currentCode);
    const snapshot = [...byCode.values()];
    byCode.set(currentCode, {
      code: currentCode,
      lastUsedAt: markCurrent ? nextRecency(snapshot) : existing?.lastUsedAt ?? nextRecency(snapshot),
    });
  }

  const rooms = [...byCode.values()]
    .sort((left, right) => right.lastUsedAt - left.lastUsedAt || left.code.localeCompare(right.code))
    .slice(0, MAX_SAVED_ROOMS);
  localStorage.setItem(ROOM_HISTORY_KEY, JSON.stringify(rooms));
  return { rooms, currentCode };
}

function rememberRoom(code: string) {
  const previous = readHistory();
  const lastUsedAt = nextRecency(previous);
  const history = previous.filter((room) => room.code !== code);
  history.unshift({ code, lastUsedAt });
  localStorage.setItem(ROOM_HISTORY_KEY, JSON.stringify(history.slice(0, MAX_SAVED_ROOMS)));
}

export function HostRoomManager() {
  const [rooms, setRooms] = useState<SavedRoom[]>([]);
  const [currentCode, setCurrentCode] = useState<string | null>(null);
  const observedCurrent = useRef<string | null>(null);

  useEffect(() => {
    let interval: number | null = null;
    const initial = window.setTimeout(() => {
      const first = reconcileHistory(true);
      observedCurrent.current = first.currentCode;
      setRooms(first.rooms);
      setCurrentCode(first.currentCode);

      interval = window.setInterval(() => {
        const nextCurrent = localStorage.getItem(CURRENT_ROOM_KEY)?.trim().toUpperCase() || null;
        const changed = nextCurrent !== observedCurrent.current;
        if (!changed) return;
        observedCurrent.current = nextCurrent;
        const next = reconcileHistory(Boolean(nextCurrent));
        setRooms(next.rooms);
        setCurrentCode(next.currentCode);
      }, 500);
    }, 0);

    return () => {
      window.clearTimeout(initial);
      if (interval !== null) window.clearInterval(interval);
    };
  }, []);

  function openRoom(code: string) {
    const token = localStorage.getItem(`${HOST_TOKEN_PREFIX}${code}`);
    if (!token) {
      const next = reconcileHistory(false);
      setRooms(next.rooms.filter((room) => room.code !== code));
      return;
    }
    localStorage.setItem(CURRENT_ROOM_KEY, code);
    rememberRoom(code);
    window.location.reload();
  }

  function removeRoom(code: string) {
    if (code === currentCode) return;
    const confirmed = window.confirm(
      `Remove Room ${code} from this browser? Saved Host access for this room will be removed here, but server game history is not deleted.`,
    );
    if (!confirmed) return;

    localStorage.removeItem(`${HOST_TOKEN_PREFIX}${code}`);
    const history = readHistory().filter((room) => room.code !== code);
    localStorage.setItem(ROOM_HISTORY_KEY, JSON.stringify(history));
    const next = reconcileHistory(false);
    setRooms(next.rooms);
  }

  function captureNewRoom(event: MouseEvent<HTMLDivElement>) {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    const button = target.closest("button");
    if (!button || button.textContent?.trim() !== "New room") return;
    const activeCode = localStorage.getItem(CURRENT_ROOM_KEY)?.trim().toUpperCase();
    if (!activeCode) return;
    const confirmed = window.confirm(
      `Create a new room? Room ${activeCode} will stay saved in Rooms so you can reopen it later.`,
    );
    if (!confirmed) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    rememberRoom(activeCode);
    const snapshot = reconcileHistory(false);
    observedCurrent.current = activeCode;
    setRooms(snapshot.rooms);
    setCurrentCode(activeCode);
  }

  return (
    <div className="stack" onClickCapture={captureNewRoom}>
      <details className="card stack" open={!currentCode}>
        <summary><strong>Rooms</strong> · {rooms.length} saved on this browser</summary>
        <p className="muted compact">Creating a new room keeps older Host access here. Remove stale non-current rooms when you no longer need them on this browser.</p>
        {rooms.length ? (
          <div className="stack">
            {rooms.map((room) => (
              <div className="split-heading" key={room.code}>
                <div>
                  <strong>Room {room.code}</strong>
                  {room.code === currentCode ? <span className="status-pill live">Current</span> : null}
                </div>
                <div className="mini-actions">
                  <button
                    className="secondary"
                    type="button"
                    disabled={room.code === currentCode}
                    onClick={() => openRoom(room.code)}
                  >
                    {room.code === currentCode ? "Open now" : "Open"}
                  </button>
                  {room.code !== currentCode ? (
                    <button className="secondary" type="button" onClick={() => removeRoom(room.code)}>
                      Remove
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        ) : <p className="muted">No saved rooms yet. Create the first room below.</p>}
      </details>
      <HostLobby />
    </div>
  );
}
