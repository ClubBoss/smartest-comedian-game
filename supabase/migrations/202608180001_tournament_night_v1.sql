create table if not exists public.tournament_nights (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null unique references public.rooms(id) on delete cascade,
  format text not null default 'league_8_v1' check (format in ('league_8_v1')),
  current_stage text not null default 'qualifier_a'
    check (current_stage in ('qualifier_a', 'qualifier_b', 'final', 'complete')),
  status text not null default 'active' check (status in ('active', 'completed')),
  base_prize integer not null default 10 check (base_prize >= 0),
  team_bonus integer not null default 0 check (team_bonus >= 0),
  champion_player_id uuid null references public.players(id) on delete set null,
  created_at timestamptz not null default now(),
  completed_at timestamptz null
);

create table if not exists public.tournament_stage_members (
  tournament_id uuid not null references public.tournament_nights(id) on delete cascade,
  stage text not null check (stage in ('qualifier_a', 'qualifier_b', 'final')),
  player_id uuid not null references public.players(id) on delete restrict,
  seed_order integer not null check (seed_order >= 0),
  qualified_at timestamptz null,
  primary key (tournament_id, stage, player_id),
  unique (tournament_id, stage, seed_order)
);

create index if not exists tournament_stage_members_player_idx
  on public.tournament_stage_members(player_id);

alter table public.score_events
  add column if not exists tournament_stage text null;

alter table public.score_events
  drop constraint if exists score_events_tournament_stage_check;

alter table public.score_events
  add constraint score_events_tournament_stage_check
  check (tournament_stage is null or tournament_stage in ('qualifier_a', 'qualifier_b', 'final'));

alter table public.question_pack_items
  add column if not exists tournament_stage text null,
  add column if not exists question_role text not null default 'regular',
  add column if not exists correct_points integer null,
  add column if not exists wrong_points integer null,
  add column if not exists hint_point_schedule jsonb not null default '[]'::jsonb;

alter table public.question_pack_items
  drop constraint if exists question_pack_items_tournament_stage_check;
alter table public.question_pack_items
  add constraint question_pack_items_tournament_stage_check
  check (tournament_stage is null or tournament_stage in ('qualifier_a', 'qualifier_b', 'final'));

alter table public.question_pack_items
  drop constraint if exists question_pack_items_role_check;
alter table public.question_pack_items
  add constraint question_pack_items_role_check
  check (question_role in ('regular', 'qualifier_super', 'team', 'last', 'double_or_nothing', 'tiebreak'));

alter table public.question_pack_items
  drop constraint if exists question_pack_items_hint_schedule_check;
alter table public.question_pack_items
  add constraint question_pack_items_hint_schedule_check
  check (jsonb_typeof(hint_point_schedule) = 'array');

create or replace function public.tag_score_event_tournament_stage()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_stage text;
begin
  if new.kind = 'revert' and new.reverted_event_id is not null then
    select e.tournament_stage
      into new.tournament_stage
    from public.score_events e
    where e.id = new.reverted_event_id;
    return new;
  end if;

  select tn.current_stage
    into v_stage
  from public.tournament_nights tn
  where tn.room_id = new.room_id
    and tn.status = 'active'
    and tn.current_stage in ('qualifier_a', 'qualifier_b', 'final')
    and exists (
      select 1
      from public.tournament_stage_members m
      where m.tournament_id = tn.id
        and m.stage = tn.current_stage
        and m.player_id = new.player_id
    );

  new.tournament_stage := v_stage;
  return new;
end;
$$;

drop trigger if exists score_events_tournament_stage_trigger on public.score_events;
create trigger score_events_tournament_stage_trigger
before insert on public.score_events
for each row execute function public.tag_score_event_tournament_stage();

create or replace view public.tournament_stage_scores as
select
  tn.id as tournament_id,
  m.stage,
  m.player_id,
  m.seed_order,
  m.qualified_at,
  coalesce(sum(e.delta) filter (
    where e.kind in ('answer', 'manual')
      and e.tournament_stage = m.stage
      and not exists (
        select 1
        from public.score_events r
        where r.reverted_event_id = e.id
      )
  ), 0)::integer as score
from public.tournament_nights tn
join public.tournament_stage_members m on m.tournament_id = tn.id
left join public.score_events e
  on e.room_id = tn.room_id
 and e.player_id = m.player_id
group by tn.id, m.stage, m.player_id, m.seed_order, m.qualified_at;

create or replace function public.create_league_8_tournament_atomic(
  p_room_id uuid,
  p_group_a_player_ids uuid[],
  p_group_b_player_ids uuid[]
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tournament_id uuid;
  v_player_id uuid;
  v_seed integer;
  v_active_count integer;
begin
  perform 1
  from public.rooms r
  where r.id = p_room_id and r.ended_at is null
  for update;
  if not found then
    raise exception using errcode = 'P0001', message = 'ERR_ROOM_NOT_FOUND';
  end if;

  select count(*) into v_active_count
  from public.players p
  where p.room_id = p_room_id and p.removed_at is null;

  if v_active_count <> 8 then
    raise exception using errcode = 'P0001', message = 'ERR_LEAGUE_8_REQUIRES_8_PLAYERS';
  end if;

  if coalesce(array_length(p_group_a_player_ids, 1), 0) <> 4
     or coalesce(array_length(p_group_b_player_ids, 1), 0) <> 4 then
    raise exception using errcode = 'P0001', message = 'ERR_LEAGUE_GROUP_SIZE';
  end if;

  if (
    select count(distinct x.player_id)
    from unnest(p_group_a_player_ids || p_group_b_player_ids) as x(player_id)
  ) <> 8 then
    raise exception using errcode = 'P0001', message = 'ERR_LEAGUE_GROUP_DUPLICATE';
  end if;

  if exists (
    select 1
    from unnest(p_group_a_player_ids || p_group_b_player_ids) as x(player_id)
    left join public.players p
      on p.id = x.player_id and p.room_id = p_room_id and p.removed_at is null
    where p.id is null
  ) then
    raise exception using errcode = 'P0001', message = 'ERR_LEAGUE_PLAYER_NOT_ACTIVE';
  end if;

  if exists (select 1 from public.tournament_nights tn where tn.room_id = p_room_id) then
    raise exception using errcode = 'P0001', message = 'ERR_TOURNAMENT_ALREADY_EXISTS';
  end if;

  insert into public.tournament_nights(room_id, format, current_stage, status)
  values (p_room_id, 'league_8_v1', 'qualifier_a', 'active')
  returning id into v_tournament_id;

  v_seed := 0;
  foreach v_player_id in array p_group_a_player_ids loop
    insert into public.tournament_stage_members(tournament_id, stage, player_id, seed_order)
    values (v_tournament_id, 'qualifier_a', v_player_id, v_seed);
    v_seed := v_seed + 1;
  end loop;

  v_seed := 0;
  foreach v_player_id in array p_group_b_player_ids loop
    insert into public.tournament_stage_members(tournament_id, stage, player_id, seed_order)
    values (v_tournament_id, 'qualifier_b', v_player_id, v_seed);
    v_seed := v_seed + 1;
  end loop;

  return v_tournament_id;
end;
$$;

create or replace function public.complete_league_qualifier_atomic(
  p_tournament_id uuid,
  p_stage text,
  p_advancing_player_ids uuid[]
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current_stage text;
  v_player_id uuid;
  v_seed integer := 0;
begin
  if p_stage not in ('qualifier_a', 'qualifier_b') then
    raise exception using errcode = 'P0001', message = 'ERR_INVALID_QUALIFIER_STAGE';
  end if;

  if coalesce(array_length(p_advancing_player_ids, 1), 0) <> 2
     or (select count(distinct x.player_id) from unnest(p_advancing_player_ids) as x(player_id)) <> 2 then
    raise exception using errcode = 'P0001', message = 'ERR_QUALIFIER_REQUIRES_TWO';
  end if;

  select tn.current_stage
    into v_current_stage
  from public.tournament_nights tn
  where tn.id = p_tournament_id and tn.status = 'active'
  for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'ERR_TOURNAMENT_NOT_FOUND';
  end if;

  if v_current_stage <> p_stage then
    raise exception using errcode = 'P0001', message = 'ERR_TOURNAMENT_STAGE_MISMATCH';
  end if;

  if exists (
    select 1
    from unnest(p_advancing_player_ids) as x(player_id)
    left join public.tournament_stage_members m
      on m.tournament_id = p_tournament_id
     and m.stage = p_stage
     and m.player_id = x.player_id
    where m.player_id is null
  ) then
    raise exception using errcode = 'P0001', message = 'ERR_QUALIFIER_PLAYER_NOT_MEMBER';
  end if;

  update public.tournament_stage_members
  set qualified_at = null
  where tournament_id = p_tournament_id and stage = p_stage;

  update public.tournament_stage_members
  set qualified_at = now()
  where tournament_id = p_tournament_id
    and stage = p_stage
    and player_id = any(p_advancing_player_ids);

  if p_stage = 'qualifier_a' then
    update public.tournament_nights
    set current_stage = 'qualifier_b'
    where id = p_tournament_id;
    return 'qualifier_b';
  end if;

  for v_player_id in
    select m.player_id
    from public.tournament_stage_members m
    where m.tournament_id = p_tournament_id
      and m.stage in ('qualifier_a', 'qualifier_b')
      and m.qualified_at is not null
    order by case m.stage when 'qualifier_a' then 0 else 1 end, m.seed_order
  loop
    insert into public.tournament_stage_members(tournament_id, stage, player_id, seed_order)
    values (p_tournament_id, 'final', v_player_id, v_seed)
    on conflict (tournament_id, stage, player_id) do update set seed_order = excluded.seed_order;
    v_seed := v_seed + 1;
  end loop;

  if v_seed <> 4 then
    raise exception using errcode = 'P0001', message = 'ERR_FINAL_REQUIRES_FOUR_QUALIFIERS';
  end if;

  update public.tournament_nights
  set current_stage = 'final'
  where id = p_tournament_id;

  return 'final';
end;
$$;

revoke all on table public.tournament_nights from anon, authenticated;
revoke all on table public.tournament_stage_members from anon, authenticated;
revoke all on public.tournament_stage_scores from anon, authenticated;

revoke all on function public.create_league_8_tournament_atomic(uuid, uuid[], uuid[]) from public;
revoke all on function public.complete_league_qualifier_atomic(uuid, text, uuid[]) from public;

grant execute on function public.create_league_8_tournament_atomic(uuid, uuid[], uuid[]) to service_role;
grant execute on function public.complete_league_qualifier_atomic(uuid, text, uuid[]) to service_role;
grant select on public.tournament_nights to service_role;
grant select, insert, update, delete on public.tournament_stage_members to service_role;
grant select on public.tournament_stage_scores to service_role;
