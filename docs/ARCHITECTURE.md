# Architecture V1

## Recommended stack

- Frontend: Next.js + React + TypeScript.
- Styling: Tailwind CSS or equivalent minimal utility layer.
- Backend/data: Supabase Postgres.
- Realtime: Supabase Realtime.
- Auth: anonymous/player session token + protected host secret; full account system deferred.
- Validation: Zod.
- Tests: Vitest for domain logic, Playwright for multi-client flows.
- Hosting: Vercel/Cloudflare-compatible web deployment; backend hosted separately in Supabase.

## Why this stack

- Realtime room state with minimal infrastructure.
- Postgres fits persistent Question Bank and audit log cleanly.
- Web-first join friction is near zero.
- Easy to evolve from private home tool to reusable party-game product.

## Logical modules

### `room`
Room lifecycle, capacity, host authority, player membership.

### `buzzer`
Buzz cycle IDs, atomic first-winner claim, reset/reopen.

### `scoring`
Append-only score transactions and derived totals.

### `questions`
Question Bank CRUD, hints, metadata, search/filter.

### `game`
Current question snapshot, reveal state, phase transitions.

### `presence`
Connection/reconnect indicators. Presence is advisory; persistent room/player data remains in Postgres.

### `audio`
Client-side sound registry and winner playback.

## Data model

### rooms
- id UUID PK
- code TEXT UNIQUE
- host_secret_hash TEXT
- capacity INT CHECK 2..10
- phase TEXT
- current_question_session_id UUID NULL
- active_buzz_cycle_id UUID NULL
- created_at TIMESTAMPTZ
- ended_at TIMESTAMPTZ NULL

### players
- id UUID PK
- room_id UUID FK
- display_name TEXT
- sound_key TEXT
- seat_order INT
- reconnect_token_hash TEXT
- removed_at TIMESTAMPTZ NULL
- joined_at TIMESTAMPTZ

### score_events
- id UUID PK
- room_id UUID FK
- player_id UUID FK
- delta INT
- reason TEXT NULL
- reverted_event_id UUID NULL
- created_at TIMESTAMPTZ

Total score = sum(active score events). This gives safe undo and auditability.

### questions
- id UUID PK
- prompt TEXT
- answer TEXT
- explanation TEXT NULL
- host_notes TEXT NULL
- category TEXT NULL
- difficulty SMALLINT NULL
- source_label TEXT NULL
- source_url TEXT NULL
- status TEXT
- created_at TIMESTAMPTZ
- updated_at TIMESTAMPTZ

### question_hints
- id UUID PK
- question_id UUID FK
- position INT
- text TEXT

### question_tags
- question_id UUID FK
- tag TEXT

### question_sessions
Snapshot used for one live round:
- id UUID PK
- room_id UUID FK
- source_question_id UUID NULL
- prompt_snapshot TEXT
- answer_snapshot TEXT
- explanation_snapshot TEXT NULL
- hints_snapshot JSONB
- revealed_hint_count INT
- answer_revealed BOOLEAN
- started_at TIMESTAMPTZ
- ended_at TIMESTAMPTZ NULL

### buzz_cycles
- id UUID PK
- room_id UUID FK
- question_session_id UUID NULL FK
- opened_at TIMESTAMPTZ
- winner_player_id UUID NULL
- winner_received_at TIMESTAMPTZ NULL
- closed_at TIMESTAMPTZ NULL

## Atomic buzz

Implement as a server-side Postgres RPC/function similar to:

1. Validate player belongs to room.
2. Validate requested cycle is current and open.
3. `UPDATE buzz_cycles SET winner_player_id = $player, winner_received_at = now(), closed_at = now() WHERE id = $cycle AND winner_player_id IS NULL AND closed_at IS NULL RETURNING ...`.
4. One caller gets a row; all later callers get no winner.

This avoids double winners without trusting device time.

## Security model

- Public room code is not host authority.
- Host mutation calls require host secret/session.
- Player mutation limited to own join/reconnect/buzz actions.
- Score/question/phase mutations host-only.
- Database RLS or server-only mutation endpoints enforce authority.

## Resilience

- Realtime messages are notifications, not source of truth.
- On reconnect, clients re-fetch canonical state.
- Audio is best-effort and decoupled from buzz acceptance.
- Host actions should expose recovery controls: reset buzzer, manual score adjustment, remove player, return to lobby.
