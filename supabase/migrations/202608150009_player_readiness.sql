alter table public.players
  add column if not exists is_ready boolean not null default false;
