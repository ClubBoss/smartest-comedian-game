create extension if not exists pgcrypto;

create table rooms (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (char_length(code) between 4 and 8),
  host_secret_hash text not null,
  capacity smallint not null check (capacity between 2 and 10),
  phase text not null default 'LOBBY' check (
    phase in ('LOBBY', 'READY', 'QUESTION', 'BUZZ_OPEN', 'BUZZ_LOCKED', 'REVEAL', 'ENDED')
  ),
  current_question_session_id uuid null,
  active_buzz_cycle_id uuid null,
  created_at timestamptz not null default now(),
  ended_at timestamptz null
);

create table players (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms(id) on delete cascade,
  display_name text not null check (char_length(trim(display_name)) between 1 and 40),
  sound_key text not null,
  seat_order smallint not null check (seat_order between 1 and 10),
  reconnect_token_hash text not null,
  removed_at timestamptz null,
  joined_at timestamptz not null default now(),
  unique (room_id, seat_order)
);

create table score_events (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms(id) on delete cascade,
  player_id uuid not null references players(id) on delete cascade,
  delta integer not null check (delta <> 0),
  reason text null,
  reverted_event_id uuid null references score_events(id),
  created_at timestamptz not null default now()
);

create table questions (
  id uuid primary key default gen_random_uuid(),
  prompt text not null check (char_length(trim(prompt)) > 0),
  answer text not null check (char_length(trim(answer)) > 0),
  explanation text null,
  host_notes text null,
  category text null,
  difficulty smallint null check (difficulty between 1 and 5),
  source_label text null,
  source_url text null,
  status text not null default 'draft' check (status in ('draft', 'ready', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table question_hints (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references questions(id) on delete cascade,
  position integer not null check (position >= 0),
  text text not null check (char_length(trim(text)) > 0),
  unique (question_id, position)
);

create table question_tags (
  question_id uuid not null references questions(id) on delete cascade,
  tag text not null check (char_length(trim(tag)) > 0),
  primary key (question_id, tag)
);

create table question_sessions (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms(id) on delete cascade,
  source_question_id uuid null references questions(id) on delete set null,
  prompt_snapshot text not null,
  answer_snapshot text not null,
  explanation_snapshot text null,
  hints_snapshot jsonb not null default '[]'::jsonb,
  revealed_hint_count integer not null default 0 check (revealed_hint_count >= 0),
  answer_revealed boolean not null default false,
  started_at timestamptz not null default now(),
  ended_at timestamptz null
);

create table buzz_cycles (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references rooms(id) on delete cascade,
  question_session_id uuid null references question_sessions(id) on delete set null,
  opened_at timestamptz not null default now(),
  winner_player_id uuid null references players(id) on delete set null,
  winner_received_at timestamptz null,
  closed_at timestamptz null
);

alter table rooms
  add constraint rooms_current_question_session_fk
  foreign key (current_question_session_id) references question_sessions(id) on delete set null;

alter table rooms
  add constraint rooms_active_buzz_cycle_fk
  foreign key (active_buzz_cycle_id) references buzz_cycles(id) on delete set null;

create index players_room_id_idx on players(room_id);
create index score_events_room_id_idx on score_events(room_id);
create index score_events_player_id_idx on score_events(player_id);
create index question_hints_question_id_idx on question_hints(question_id);
create index question_sessions_room_id_idx on question_sessions(room_id);
create index buzz_cycles_room_id_idx on buzz_cycles(room_id);
