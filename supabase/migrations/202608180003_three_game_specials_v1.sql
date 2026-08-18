alter table public.room_question_queue
  add column if not exists question_role text not null default 'regular',
  add column if not exists correct_points integer null,
  add column if not exists wrong_points integer null;

alter table public.room_question_queue drop constraint if exists room_question_queue_question_role_check;
alter table public.room_question_queue add constraint room_question_queue_question_role_check
  check (question_role in ('regular', 'qualifier_super', 'team', 'last', 'double_or_nothing', 'tiebreak'));

alter table public.question_sessions
  add column if not exists question_role_snapshot text not null default 'regular',
  add column if not exists correct_points_snapshot integer null,
  add column if not exists wrong_points_snapshot integer null;

alter table public.question_sessions drop constraint if exists question_sessions_question_role_snapshot_check;
alter table public.question_sessions add constraint question_sessions_question_role_snapshot_check
  check (question_role_snapshot in ('regular', 'qualifier_super', 'team', 'last', 'double_or_nothing', 'tiebreak'));

alter table public.tournament_nights
  add column if not exists final_payout integer null check (final_payout is null or final_payout >= 0),
  add column if not exists double_resolved boolean not null default false,
  add column if not exists double_attempted boolean not null default false,
  add column if not exists double_correct boolean null;

create or replace function public.snapshot_game_question_role()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.queue_item_id is null then
    return new;
  end if;

  select q.question_role, q.correct_points, q.wrong_points
    into new.question_role_snapshot, new.correct_points_snapshot, new.wrong_points_snapshot
  from public.room_question_queue q
  where q.id = new.queue_item_id;

  return new;
end;
$$;

drop trigger if exists question_sessions_game_role_trigger on public.question_sessions;
create trigger question_sessions_game_role_trigger
before insert on public.question_sessions
for each row execute function public.snapshot_game_question_role();

create or replace function public.guard_special_question_buzzer()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_role text;
begin
  if new.question_session_id is null then
    return new;
  end if;

  select question_role_snapshot into v_role
  from public.question_sessions
  where id = new.question_session_id;

  if coalesce(v_role, 'regular') not in ('regular', 'qualifier_super', 'last', 'tiebreak') then
    raise exception using errcode = 'P0001', message = 'ERR_QUESTION_ROLE_NO_BUZZ';
  end if;

  return new;
end;
$$;

drop trigger if exists buzz_cycles_special_role_guard on public.buzz_cycles;
create trigger buzz_cycles_special_role_guard
before insert on public.buzz_cycles
for each row execute function public.guard_special_question_buzzer();

create or replace function public.queue_question_pack_with_roles_atomic(
  p_room_id uuid,
  p_pack_id uuid
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_position integer;
  v_item record;
  v_count integer := 0;
begin
  perform 1 from public.rooms r
  where r.id = p_room_id and r.ended_at is null
  for update;
  if not found then
    raise exception using errcode = 'P0001', message = 'ERR_ROOM_NOT_FOUND';
  end if;

  if not exists (select 1 from public.question_packs p where p.id = p_pack_id) then
    raise exception using errcode = 'P0001', message = 'ERR_PACK_NOT_FOUND';
  end if;

  if exists (
    select 1
    from public.question_pack_items i
    left join public.questions q on q.id = i.question_id
    where i.pack_id = p_pack_id and (q.id is null or q.status <> 'ready')
  ) then
    raise exception using errcode = 'P0001', message = 'ERR_QUESTION_NOT_READY';
  end if;

  select coalesce(max(position), -1) + 1 into v_position
  from public.room_question_queue
  where room_id = p_room_id;

  for v_item in
    select i.question_id, i.question_role, i.correct_points, i.wrong_points
    from public.question_pack_items i
    where i.pack_id = p_pack_id
    order by i.position
  loop
    insert into public.room_question_queue(
      room_id, question_id, position, state, question_role, correct_points, wrong_points
    ) values (
      p_room_id,
      v_item.question_id,
      v_position,
      'queued',
      coalesce(v_item.question_role, 'regular'),
      coalesce(v_item.correct_points,
        case coalesce(v_item.question_role, 'regular')
          when 'qualifier_super' then 3
          when 'last' then 2
          when 'regular' then 1
          when 'tiebreak' then 1
          else null
        end
      ),
      coalesce(v_item.wrong_points,
        case coalesce(v_item.question_role, 'regular')
          when 'qualifier_super' then 0
          when 'team' then 0
          when 'double_or_nothing' then 0
          else -1
        end
      )
    );
    v_position := v_position + 1;
    v_count := v_count + 1;
  end loop;

  if v_count = 0 then
    raise exception using errcode = 'P0001', message = 'ERR_PACK_EMPTY';
  end if;

  return v_count;
end;
$$;

create or replace function public.set_team_question_result_atomic(
  p_tournament_id uuid,
  p_correct boolean
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_prize integer;
begin
  update public.tournament_nights
  set team_bonus = case when p_correct then 2 else 0 end
  where id = p_tournament_id
    and status = 'active'
    and current_stage = 'final'
  returning base_prize + team_bonus into v_prize;

  if v_prize is null then
    raise exception using errcode = 'P0001', message = 'ERR_GAME_NOT_IN_FINAL';
  end if;

  return v_prize;
end;
$$;

create or replace function public.complete_game_night_atomic(
  p_tournament_id uuid,
  p_champion_player_id uuid
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_prize integer;
begin
  if not exists (
    select 1 from public.tournament_stage_members m
    where m.tournament_id = p_tournament_id
      and m.stage = 'final'
      and m.player_id = p_champion_player_id
  ) then
    raise exception using errcode = 'P0001', message = 'ERR_CHAMPION_NOT_FINALIST';
  end if;

  update public.tournament_nights
  set champion_player_id = p_champion_player_id,
      current_stage = 'complete',
      status = 'completed',
      completed_at = now(),
      final_payout = base_prize + team_bonus,
      double_resolved = false,
      double_attempted = false,
      double_correct = null
  where id = p_tournament_id
    and status = 'active'
    and current_stage = 'final'
  returning final_payout into v_prize;

  if v_prize is null then
    raise exception using errcode = 'P0001', message = 'ERR_GAME_NOT_IN_FINAL';
  end if;

  return v_prize;
end;
$$;

create or replace function public.resolve_game_night_prize_atomic(
  p_tournament_id uuid,
  p_risk boolean,
  p_correct boolean default null
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_prize integer;
  v_payout integer;
begin
  select base_prize + team_bonus into v_prize
  from public.tournament_nights
  where id = p_tournament_id
    and status = 'completed'
    and champion_player_id is not null
    and double_resolved = false
  for update;

  if v_prize is null then
    raise exception using errcode = 'P0001', message = 'ERR_PRIZE_ALREADY_RESOLVED';
  end if;

  if p_risk then
    if p_correct is null then
      raise exception using errcode = 'P0001', message = 'ERR_DOUBLE_RESULT_REQUIRED';
    end if;
    v_payout := case when p_correct then v_prize * 2 else 0 end;
  else
    v_payout := v_prize;
  end if;

  update public.tournament_nights
  set final_payout = v_payout,
      double_resolved = true,
      double_attempted = p_risk,
      double_correct = case when p_risk then p_correct else null end
  where id = p_tournament_id;

  return v_payout;
end;
$$;

revoke all on function public.queue_question_pack_with_roles_atomic(uuid, uuid) from public;
revoke all on function public.set_team_question_result_atomic(uuid, boolean) from public;
revoke all on function public.complete_game_night_atomic(uuid, uuid) from public;
revoke all on function public.resolve_game_night_prize_atomic(uuid, boolean, boolean) from public;

grant execute on function public.queue_question_pack_with_roles_atomic(uuid, uuid) to service_role;
grant execute on function public.set_team_question_result_atomic(uuid, boolean) to service_role;
grant execute on function public.complete_game_night_atomic(uuid, uuid) to service_role;
grant execute on function public.resolve_game_night_prize_atomic(uuid, boolean, boolean) to service_role;