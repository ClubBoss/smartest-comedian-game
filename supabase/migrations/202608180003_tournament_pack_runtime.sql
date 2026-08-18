alter table public.tournament_nights
  add column if not exists qualifier_a_pack_id uuid null references public.question_packs(id) on delete restrict,
  add column if not exists qualifier_b_pack_id uuid null references public.question_packs(id) on delete restrict,
  add column if not exists final_pack_id uuid null references public.question_packs(id) on delete restrict,
  add column if not exists final_payout integer null check (final_payout is null or final_payout >= 0),
  add column if not exists double_attempted boolean not null default false,
  add column if not exists double_correct boolean null;

alter table public.room_question_queue
  add column if not exists tournament_stage text null,
  add column if not exists question_role text not null default 'regular',
  add column if not exists correct_points integer null,
  add column if not exists wrong_points integer null,
  add column if not exists hint_point_schedule jsonb not null default '[]'::jsonb;

alter table public.room_question_queue drop constraint if exists room_question_queue_tournament_stage_check;
alter table public.room_question_queue add constraint room_question_queue_tournament_stage_check
  check (tournament_stage is null or tournament_stage in ('qualifier_a', 'qualifier_b', 'final'));
alter table public.room_question_queue drop constraint if exists room_question_queue_question_role_check;
alter table public.room_question_queue add constraint room_question_queue_question_role_check
  check (question_role in ('regular', 'qualifier_super', 'team', 'last', 'double_or_nothing', 'tiebreak'));
alter table public.room_question_queue drop constraint if exists room_question_queue_hint_schedule_check;
alter table public.room_question_queue add constraint room_question_queue_hint_schedule_check
  check (jsonb_typeof(hint_point_schedule) = 'array');

alter table public.question_sessions
  add column if not exists tournament_stage_snapshot text null,
  add column if not exists question_role_snapshot text not null default 'regular',
  add column if not exists correct_points_snapshot integer null,
  add column if not exists wrong_points_snapshot integer null,
  add column if not exists hint_point_schedule_snapshot jsonb not null default '[]'::jsonb;

alter table public.question_sessions drop constraint if exists question_sessions_tournament_stage_snapshot_check;
alter table public.question_sessions add constraint question_sessions_tournament_stage_snapshot_check
  check (tournament_stage_snapshot is null or tournament_stage_snapshot in ('qualifier_a', 'qualifier_b', 'final'));
alter table public.question_sessions drop constraint if exists question_sessions_question_role_snapshot_check;
alter table public.question_sessions add constraint question_sessions_question_role_snapshot_check
  check (question_role_snapshot in ('regular', 'qualifier_super', 'team', 'last', 'double_or_nothing', 'tiebreak'));
alter table public.question_sessions drop constraint if exists question_sessions_hint_schedule_snapshot_check;
alter table public.question_sessions add constraint question_sessions_hint_schedule_snapshot_check
  check (jsonb_typeof(hint_point_schedule_snapshot) = 'array');

create table if not exists public.special_answer_submissions (
  question_session_id uuid not null references public.question_sessions(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  answer_text text not null check (char_length(trim(answer_text)) between 1 and 500),
  locked_at timestamptz not null default now(),
  primary key (question_session_id, player_id)
);

create or replace function public.snapshot_tournament_question_metadata()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.queue_item_id is null then return new; end if;
  select q.tournament_stage, q.question_role, q.correct_points, q.wrong_points, q.hint_point_schedule
    into new.tournament_stage_snapshot, new.question_role_snapshot, new.correct_points_snapshot,
         new.wrong_points_snapshot, new.hint_point_schedule_snapshot
  from public.room_question_queue q
  where q.id = new.queue_item_id;
  return new;
end;
$$;

drop trigger if exists question_sessions_tournament_metadata_trigger on public.question_sessions;
create trigger question_sessions_tournament_metadata_trigger
before insert on public.question_sessions
for each row execute function public.snapshot_tournament_question_metadata();

create or replace function public.guard_buzz_question_role()
returns trigger
language plpgsql
set search_path = public
as $$
declare v_role text;
begin
  if new.question_session_id is null then return new; end if;
  select question_role_snapshot into v_role from public.question_sessions where id = new.question_session_id;
  if coalesce(v_role, 'regular') not in ('regular', 'last', 'tiebreak') then
    raise exception using errcode = 'P0001', message = 'ERR_QUESTION_ROLE_NO_BUZZ';
  end if;
  return new;
end;
$$;

drop trigger if exists buzz_cycles_question_role_guard on public.buzz_cycles;
create trigger buzz_cycles_question_role_guard
before insert on public.buzz_cycles
for each row execute function public.guard_buzz_question_role();

create or replace function public.set_tournament_packs_atomic(
  p_tournament_id uuid,
  p_qualifier_a_pack_id uuid,
  p_qualifier_b_pack_id uuid,
  p_final_pack_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare v_pack_id uuid;
begin
  perform 1 from public.tournament_nights tn
  where tn.id = p_tournament_id and tn.status = 'active' and tn.current_stage = 'qualifier_a'
  for update;
  if not found then raise exception using errcode = 'P0001', message = 'ERR_TOURNAMENT_NOT_CONFIGURABLE'; end if;

  foreach v_pack_id in array array[p_qualifier_a_pack_id, p_qualifier_b_pack_id, p_final_pack_id] loop
    if v_pack_id is null or not exists (
      select 1 from public.question_packs p
      where p.id = v_pack_id
        and exists (select 1 from public.question_pack_items i where i.pack_id = p.id)
    ) then
      raise exception using errcode = 'P0001', message = 'ERR_TOURNAMENT_PACK_INVALID';
    end if;
  end loop;

  update public.tournament_nights
  set qualifier_a_pack_id = p_qualifier_a_pack_id,
      qualifier_b_pack_id = p_qualifier_b_pack_id,
      final_pack_id = p_final_pack_id
  where id = p_tournament_id;
  return p_tournament_id;
end;
$$;

create or replace function public.queue_tournament_stage_pack_atomic(
  p_tournament_id uuid,
  p_stage text
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_room_id uuid;
  v_current_stage text;
  v_pack_id uuid;
  v_position integer;
  v_item record;
  v_count integer := 0;
begin
  if p_stage not in ('qualifier_a', 'qualifier_b', 'final') then
    raise exception using errcode = 'P0001', message = 'ERR_INVALID_TOURNAMENT_STAGE';
  end if;

  select tn.room_id, tn.current_stage,
         case p_stage when 'qualifier_a' then tn.qualifier_a_pack_id when 'qualifier_b' then tn.qualifier_b_pack_id else tn.final_pack_id end
    into v_room_id, v_current_stage, v_pack_id
  from public.tournament_nights tn
  where tn.id = p_tournament_id and tn.status = 'active'
  for update;
  if not found then raise exception using errcode = 'P0001', message = 'ERR_TOURNAMENT_NOT_FOUND'; end if;
  if v_current_stage <> p_stage then raise exception using errcode = 'P0001', message = 'ERR_TOURNAMENT_STAGE_MISMATCH'; end if;
  if v_pack_id is null then raise exception using errcode = 'P0001', message = 'ERR_TOURNAMENT_PACK_NOT_SET'; end if;

  if exists (
    select 1 from public.room_question_queue q
    where q.room_id = v_room_id and q.tournament_stage = p_stage
  ) then
    raise exception using errcode = 'P0001', message = 'ERR_TOURNAMENT_STAGE_ALREADY_QUEUED';
  end if;

  if exists (
    select 1
    from public.question_pack_items i
    left join public.questions q on q.id = i.question_id
    where i.pack_id = v_pack_id
      and (q.id is null or q.status <> 'ready' or (i.tournament_stage is not null and i.tournament_stage <> p_stage))
  ) then
    raise exception using errcode = 'P0001', message = 'ERR_TOURNAMENT_PACK_INVALID';
  end if;

  if p_stage in ('qualifier_a', 'qualifier_b') and exists (
    select 1 from public.question_pack_items i
    where i.pack_id = v_pack_id and i.question_role not in ('regular', 'qualifier_super', 'tiebreak')
  ) then
    raise exception using errcode = 'P0001', message = 'ERR_TOURNAMENT_PACK_ROLE_INVALID';
  end if;
  if p_stage = 'final' and exists (
    select 1 from public.question_pack_items i
    where i.pack_id = v_pack_id and i.question_role not in ('regular', 'team', 'last', 'double_or_nothing', 'tiebreak')
  ) then
    raise exception using errcode = 'P0001', message = 'ERR_TOURNAMENT_PACK_ROLE_INVALID';
  end if;

  select coalesce(max(position), -1) + 1 into v_position
  from public.room_question_queue where room_id = v_room_id;

  for v_item in
    select i.question_id, i.question_role, i.correct_points, i.wrong_points, i.hint_point_schedule
    from public.question_pack_items i
    where i.pack_id = v_pack_id order by i.position
  loop
    insert into public.room_question_queue(
      room_id, question_id, position, state, tournament_stage, question_role,
      correct_points, wrong_points, hint_point_schedule
    ) values (
      v_room_id, v_item.question_id, v_position, 'queued', p_stage, v_item.question_role,
      coalesce(v_item.correct_points,
        case v_item.question_role when 'last' then 2 when 'regular' then 1 else null end),
      coalesce(v_item.wrong_points,
        case when v_item.question_role in ('regular', 'last', 'tiebreak') then -1 else 0 end),
      case when v_item.question_role = 'qualifier_super' and jsonb_array_length(v_item.hint_point_schedule) = 0
        then '[3,2,1,0]'::jsonb else v_item.hint_point_schedule end
    );
    v_position := v_position + 1;
    v_count := v_count + 1;
  end loop;

  if v_count = 0 then raise exception using errcode = 'P0001', message = 'ERR_TOURNAMENT_PACK_EMPTY'; end if;
  return v_count;
end;
$$;

create or replace function public.submit_special_answer_atomic(
  p_question_session_id uuid,
  p_player_id uuid,
  p_answer_text text
)
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  v_room_id uuid;
  v_stage text;
  v_role text;
  v_locked timestamptz;
begin
  if char_length(trim(coalesce(p_answer_text, ''))) < 1 or char_length(trim(p_answer_text)) > 500 then
    raise exception using errcode = 'P0001', message = 'ERR_SPECIAL_ANSWER_INVALID';
  end if;

  select s.room_id, s.tournament_stage_snapshot, s.question_role_snapshot
    into v_room_id, v_stage, v_role
  from public.question_sessions s
  where s.id = p_question_session_id and s.ended_at is null and s.stimulus_revealed = true
  for update;
  if not found then raise exception using errcode = 'P0001', message = 'ERR_NO_ACTIVE_QUESTION'; end if;
  if v_role <> 'qualifier_super' then raise exception using errcode = 'P0001', message = 'ERR_SPECIAL_ANSWER_ROLE'; end if;

  if not exists (
    select 1 from public.tournament_nights tn
    join public.tournament_stage_members m on m.tournament_id = tn.id and m.stage = v_stage and m.player_id = p_player_id
    where tn.room_id = v_room_id and tn.status = 'active' and tn.current_stage = v_stage
  ) then
    raise exception using errcode = 'P0001', message = 'ERR_TOURNAMENT_PLAYER_INACTIVE';
  end if;

  insert into public.special_answer_submissions(question_session_id, player_id, answer_text)
  values (p_question_session_id, p_player_id, trim(p_answer_text))
  on conflict (question_session_id, player_id) do nothing
  returning locked_at into v_locked;
  if v_locked is null then raise exception using errcode = 'P0001', message = 'ERR_SPECIAL_ANSWER_ALREADY_LOCKED'; end if;
  return v_locked;
end;
$$;

create or replace function public.set_tournament_team_bonus_atomic(p_tournament_id uuid, p_correct boolean)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare v_total integer;
begin
  update public.tournament_nights
  set team_bonus = case when p_correct then 2 else 0 end
  where id = p_tournament_id and status = 'active' and current_stage = 'final'
  returning base_prize + team_bonus into v_total;
  if v_total is null then raise exception using errcode = 'P0001', message = 'ERR_TOURNAMENT_NOT_IN_FINAL'; end if;
  return v_total;
end;
$$;

create or replace function public.complete_tournament_atomic(p_tournament_id uuid, p_champion_player_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare v_prize integer;
begin
  if not exists (
    select 1 from public.tournament_stage_members m
    where m.tournament_id = p_tournament_id and m.stage = 'final' and m.player_id = p_champion_player_id
  ) then raise exception using errcode = 'P0001', message = 'ERR_CHAMPION_NOT_FINALIST'; end if;

  update public.tournament_nights
  set champion_player_id = p_champion_player_id,
      current_stage = 'complete', status = 'completed', completed_at = now(),
      final_payout = base_prize + team_bonus
  where id = p_tournament_id and status = 'active' and current_stage = 'final'
  returning final_payout into v_prize;
  if v_prize is null then raise exception using errcode = 'P0001', message = 'ERR_TOURNAMENT_NOT_IN_FINAL'; end if;
  return v_prize;
end;
$$;

create or replace function public.resolve_double_or_nothing_atomic(
  p_tournament_id uuid,
  p_risk boolean,
  p_correct boolean default null
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare v_prize integer; v_payout integer;
begin
  select base_prize + team_bonus into v_prize
  from public.tournament_nights
  where id = p_tournament_id and status = 'completed' and champion_player_id is not null
  for update;
  if v_prize is null then raise exception using errcode = 'P0001', message = 'ERR_TOURNAMENT_NOT_COMPLETE'; end if;

  if not p_risk then
    v_payout := v_prize;
  else
    if p_correct is null then raise exception using errcode = 'P0001', message = 'ERR_DOUBLE_RESULT_REQUIRED'; end if;
    v_payout := case when p_correct then v_prize * 2 else 0 end;
  end if;

  update public.tournament_nights
  set double_attempted = p_risk,
      double_correct = case when p_risk then p_correct else null end,
      final_payout = v_payout
  where id = p_tournament_id;
  return v_payout;
end;
$$;

revoke all on table public.special_answer_submissions from anon, authenticated;
revoke all on function public.set_tournament_packs_atomic(uuid, uuid, uuid, uuid) from public;
revoke all on function public.queue_tournament_stage_pack_atomic(uuid, text) from public;
revoke all on function public.submit_special_answer_atomic(uuid, uuid, text) from public;
revoke all on function public.set_tournament_team_bonus_atomic(uuid, boolean) from public;
revoke all on function public.complete_tournament_atomic(uuid, uuid) from public;
revoke all on function public.resolve_double_or_nothing_atomic(uuid, boolean, boolean) from public;

grant execute on function public.set_tournament_packs_atomic(uuid, uuid, uuid, uuid) to service_role;
grant execute on function public.queue_tournament_stage_pack_atomic(uuid, text) to service_role;
grant execute on function public.submit_special_answer_atomic(uuid, uuid, text) to service_role;
grant execute on function public.set_tournament_team_bonus_atomic(uuid, boolean) to service_role;
grant execute on function public.complete_tournament_atomic(uuid, uuid) to service_role;
grant execute on function public.resolve_double_or_nothing_atomic(uuid, boolean, boolean) to service_role;
grant select, insert on public.special_answer_submissions to service_role;
