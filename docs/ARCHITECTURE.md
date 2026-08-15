# Architecture V1

## Recommended stack

- Frontend: Next.js + React + TypeScript.
- Backend/data: Supabase Postgres.
- Realtime: Supabase Realtime.
- Media: Supabase Storage for question images and optional custom buzzer audio.
- Auth: anonymous/player session token + protected host secret; full account system deferred.
- Tests: Vitest for domain logic, Playwright for multi-client flows.

## Architectural principles

- Host authority is explicit and recoverable.
- Realtime notifications are not source of truth; Postgres state is canonical.
- Question content is separate from live question snapshots.
- Buzzer ordering is server-authoritative.
- Wrong-answer lockout is cycle/question scoped, not global.
- Scoring is append-only and semantically classified.
- Media failure cannot corrupt game state.

## Core tables

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
- sound_type TEXT: builtin | custom
- sound_key TEXT NULL
- custom_sound_path TEXT NULL
- custom_sound_mime_type TEXT NULL
- seat_order INT
- reconnect_token_hash TEXT
- removed_at TIMESTAMPTZ NULL
- joined_at TIMESTAMPTZ

### score_events
- id UUID PK
- room_id UUID FK
- player_id UUID FK
- kind TEXT: correct | bonus | penalty | manual
- delta INT
- reason TEXT NULL
- reverted_event_id UUID NULL
- created_at TIMESTAMPTZ

Totals are derived from non-reverted append-only events.

### questions
- id UUID PK
- prompt TEXT NULL
- answer TEXT
- answer_variants JSONB
- explanation TEXT NULL
- host_notes TEXT NULL
- category TEXT NULL
- difficulty SMALLINT NULL
- source_label TEXT NULL
- source_url TEXT NULL
- status TEXT
- created_at TIMESTAMPTZ
- updated_at TIMESTAMPTZ

Application validation requires a prompt or at least one image asset.

### question_hints
Ordered reusable hints.

### question_assets
Ordered media assets. V1 `asset_type=image`; storage path + mime/dimensions/alt/caption metadata are persistent content.

### question_tags
Reusable free-form tags.

### room_question_queue
- id UUID PK
- room_id UUID FK
- question_id UUID NULL FK
- position INT
- state TEXT: queued | played | skipped
- added_at TIMESTAMPTZ

Queue is a host workflow aid. Starting an item creates a question-session snapshot.

### question_sessions
Immutable live-round snapshot:
- id UUID PK
- room_id UUID FK
- source_question_id UUID NULL
- prompt_snapshot TEXT NULL
- answer_snapshot TEXT
- answer_variants_snapshot JSONB
- explanation_snapshot TEXT NULL
- host_notes_snapshot TEXT NULL
- hints_snapshot JSONB
- assets_snapshot JSONB
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

### buzz_attempts
- id UUID PK
- buzz_cycle_id UUID FK
- player_id UUID FK
- received_at TIMESTAMPTZ
- unique(cycle, player)

Used for audit/debugging and to make concurrency behavior observable without trusting device clocks.

### buzz_cycle_exclusions
- buzz_cycle_id UUID FK
- player_id UUID FK
- reason TEXT
- PK(cycle, player)

When a player answers incorrectly, the next cycle for the same question can exclude that player while other players remain eligible.

## Atomic buzz flow

1. Validate player belongs to room and is not excluded for the requested current cycle.
2. Record a server-received buzz attempt (one per player/cycle).
3. Atomically set `winner_player_id` only if the cycle is open and has no winner.
4. Broadcast canonical winner.
5. Wrong answer does not end the question automatically; host may create a new cycle and carry forward exclusions.

## Question queue

Queue preserves planned order without coupling Question Bank source content to live state. It is intentionally lightweight: no V1 round engine. Host can reorder/skip/insert at any time.

## Media handling

- Question images and custom sounds are stored in managed object storage.
- Database stores stable paths and metadata, not raw blobs.
- Upload validation is server-enforced.
- Image/audio fetch failure degrades gracefully.
- Source media edits/deletes must respect live snapshot retention.

## Security model

- Public room code is not host authority.
- Host mutation calls require host secret/session.
- Player mutation limited to own join/reconnect/buzz/sound actions.
- Score/question/media/queue/phase mutations are host-only except a permitted player's custom buzzer upload flow.
- RLS or server-only endpoints enforce authority.
