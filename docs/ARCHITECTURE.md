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
- Buzzer ordering is server-authoritative in the normal path, with auditable host override for recovery.
- Wrong-answer lockout is cycle/question scoped, not global.
- Scoring is append-only and semantically classified.
- Media failure cannot corrupt game state.
- Preloading a question is private until the host reveals its learner-facing stimulus.

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
- stimulus_revealed BOOLEAN
- revealed_hint_count INT
- answer_revealed BOOLEAN
- started_at TIMESTAMPTZ
- ended_at TIMESTAMPTZ NULL

Host-only answer/notes are never exposed through learner-facing reads. `stimulus_revealed=false` allows preloading the question privately before putting text/photos on the shared display.

### buzz_cycles
- id UUID PK
- room_id UUID FK
- question_session_id UUID NULL FK
- opened_at TIMESTAMPTZ
- winner_player_id UUID NULL
- winner_source TEXT NULL: buzz | host
- winner_received_at TIMESTAMPTZ NULL
- closed_at TIMESTAMPTZ NULL

Normal winner source is `buzz`. Host recovery may assign/replace the winner and records `winner_source=host`.

### buzz_attempts
- id UUID PK
- buzz_cycle_id UUID FK
- player_id UUID FK
- received_at TIMESTAMPTZ
- unique(cycle, player)

### buzz_cycle_exclusions
- buzz_cycle_id UUID FK
- player_id UUID FK
- reason TEXT
- PK(cycle, player)

## Atomic buzz flow

1. Validate player belongs to room and is not excluded.
2. Record server-received attempt.
3. Atomically set winner with `winner_source=buzz` only if cycle is open and winner is empty.
4. Broadcast canonical winner.
5. Host can explicitly override winner with `winner_source=host` as a recovery action.
6. Wrong answer may create a new cycle carrying prior wrong-answer exclusions.

## Question/media flow

- Host can queue and preload a question without learner disclosure.
- Starting creates an immutable snapshot.
- `stimulus_revealed` controls shared text/image visibility.
- Hints and answer have separate reveal state.
- Source edits never mutate the snapshot.
- Media/audio failures degrade gracefully and do not alter canonical game state.

## Security model

- Public room code is not host authority.
- Host mutation calls require host secret/session.
- Player mutation limited to own join/reconnect/buzz/sound actions.
- Score/question/media/queue/reveal/override/phase mutations are host-only except permitted custom buzzer upload.
- Host-only answer variants/notes require protected reads.
- RLS or server-only endpoints enforce authority.
