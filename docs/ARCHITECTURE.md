# Architecture V1

## Recommended stack

- Frontend: Next.js + React + TypeScript.
- Styling: minimal utility/CSS layer.
- Backend/data: Supabase Postgres.
- Realtime: Supabase Realtime.
- Media: Supabase Storage for question images and optional custom buzzer audio.
- Auth: anonymous/player session token + protected host secret; full account system deferred.
- Validation: application/domain validation with strict TypeScript; schema library may be added when forms arrive.
- Tests: Vitest for domain logic, Playwright for multi-client flows.

## Logical modules

### `room`
Room lifecycle, capacity, host authority, player membership.

### `buzzer`
Buzz cycle IDs, atomic first-winner claim, reset/reopen.

### `scoring`
Append-only score transactions and derived totals.

### `questions`
Question Bank CRUD, ordered hints, ordered images, metadata, search/filter.

### `game`
Current question snapshot, media snapshot, reveal state, phase transitions.

### `presence`
Connection/reconnect indicators. Persistent room/player data remains canonical in Postgres.

### `media`
Question-image and custom-buzzer-audio storage metadata. Blob storage is not the source of game state.

### `audio`
Built-in sound registry plus custom sound playback.

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
- sound_type TEXT: builtin | custom
- sound_key TEXT NULL for builtin registry key
- custom_sound_path TEXT NULL for uploaded audio
- custom_sound_mime_type TEXT NULL
- seat_order INT
- reconnect_token_hash TEXT
- removed_at TIMESTAMPTZ NULL
- joined_at TIMESTAMPTZ

Player sound selection is part of reconnectable identity. Application/UI should keep active sounds distinct in a room; custom uploads naturally have unique storage paths.

### score_events
- id UUID PK
- room_id UUID FK
- player_id UUID FK
- delta INT
- reason TEXT NULL
- reverted_event_id UUID NULL
- created_at TIMESTAMPTZ

Total score = sum(active score events).

### questions
- id UUID PK
- prompt TEXT NULL
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

Application validation requires a non-empty prompt or at least one question asset.

### question_hints
- id UUID PK
- question_id UUID FK
- position INT
- text TEXT

### question_assets
- id UUID PK
- question_id UUID FK
- asset_type TEXT (V1: image)
- position INT
- storage_path TEXT
- mime_type TEXT
- alt_text TEXT NULL
- caption TEXT NULL
- width INT NULL
- height INT NULL

Assets are ordered and editable independently from source code.

### question_tags
- question_id UUID FK
- tag TEXT

### question_sessions
Immutable live-round snapshot:
- id UUID PK
- room_id UUID FK
- source_question_id UUID NULL
- prompt_snapshot TEXT NULL
- answer_snapshot TEXT
- explanation_snapshot TEXT NULL
- hints_snapshot JSONB
- assets_snapshot JSONB
- revealed_hint_count INT
- answer_revealed BOOLEAN
- started_at TIMESTAMPTZ
- ended_at TIMESTAMPTZ NULL

`assets_snapshot` stores ordered immutable metadata/storage references sufficient to reproduce the played round even if the source question is later edited.

### buzz_cycles
- id UUID PK
- room_id UUID FK
- question_session_id UUID NULL FK
- opened_at TIMESTAMPTZ
- winner_player_id UUID NULL
- winner_received_at TIMESTAMPTZ NULL
- closed_at TIMESTAMPTZ NULL

Question session remains nullable so manual gameplay is never blocked by Question Bank.

## Atomic buzz

Implement server-side:

1. Validate player belongs to room.
2. Validate requested cycle is current and open.
3. Atomically update the cycle only when `winner_player_id IS NULL` and `closed_at IS NULL`.
4. One caller gets the row; later callers do not.

Client timestamps are never authoritative.

## Media handling

- Question images and custom sounds are uploaded to managed object storage.
- Database stores stable paths and metadata, not raw blobs.
- Upload validation is server-enforced before metadata becomes usable.
- Image/audio fetch failure must degrade gracefully and never corrupt room state.
- Deleting/editing source Question Bank media must not invalidate already-played snapshots; storage-retention policy must account for referenced snapshots.

## Security model

- Public room code is not host authority.
- Host mutation calls require host secret/session.
- Player mutation is limited to own join/reconnect/buzz/sound-selection actions.
- Score/question/media/phase mutations are host-only except a player's own permitted custom buzzer upload flow.
- Database RLS or server-only mutation endpoints enforce authority.

## Resilience

- Realtime messages are notifications, not source of truth.
- On reconnect, clients re-fetch canonical state.
- Audio/media are best-effort and decoupled from buzz acceptance.
- Host recovery controls remain available.
