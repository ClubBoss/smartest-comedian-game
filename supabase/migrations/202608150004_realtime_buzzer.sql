create or replace function public.open_buzz_cycle_atomic(p_room_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_previous_cycle uuid;
  v_question_session uuid;
  v_cycle_id uuid;
  v_player_count integer;
begin
  select active_buzz_cycle_id, current_question_session_id
    into v_previous_cycle, v_question_session
  from public.rooms
  where id = p_room_id and ended_at is null
  for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'ERR_ROOM_NOT_FOUND';
  end if;

  select count(*) into v_player_count
  from public.players
  where room_id = p_room_id and removed_at is null;

  if v_player_count < 2 then
    raise exception using errcode = 'P0001', message = 'ERR_NOT_ENOUGH_PLAYERS';
  end if;

  if v_previous_cycle is not null then
    update public.buzz_cycles
      set closed_at = coalesce(closed_at, now())
    where id = v_previous_cycle;
  end if;

  insert into public.buzz_cycles (room_id, question_session_id)
  values (p_room_id, v_question_session)
  returning id into v_cycle_id;

  update public.rooms
    set active_buzz_cycle_id = v_cycle_id,
        phase = 'BUZZ_OPEN'
  where id = p_room_id;

  return v_cycle_id;
end;
$$;

create or replace function public.claim_buzz_atomic(
  p_cycle_id uuid,
  p_player_id uuid
)
returns table(accepted boolean, winner_player_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_room_id uuid;
  v_winner uuid;
begin
  select bc.room_id into v_room_id
  from public.buzz_cycles bc
  join public.rooms r on r.id = bc.room_id
  where bc.id = p_cycle_id
    and r.active_buzz_cycle_id = bc.id
    and r.ended_at is null;

  if v_room_id is null then
    raise exception using errcode = 'P0001', message = 'ERR_STALE_CYCLE';
  end if;

  if not exists (
    select 1 from public.players p
    where p.id = p_player_id
      and p.room_id = v_room_id
      and p.removed_at is null
  ) then
    raise exception using errcode = 'P0001', message = 'ERR_PLAYER_NOT_ELIGIBLE';
  end if;

  insert into public.buzz_attempts (buzz_cycle_id, player_id)
  values (p_cycle_id, p_player_id)
  on conflict (buzz_cycle_id, player_id) do nothing;

  update public.buzz_cycles as bc
    set winner_player_id = p_player_id,
        winner_source = 'buzz',
        winner_received_at = now(),
        closed_at = now()
  where bc.id = p_cycle_id
    and bc.winner_player_id is null
    and bc.closed_at is null
  returning bc.winner_player_id into v_winner;

  if v_winner is not null then
    update public.rooms as r
      set phase = 'BUZZ_LOCKED'
    where r.id = v_room_id and r.active_buzz_cycle_id = p_cycle_id;
    return query select true, v_winner;
    return;
  end if;

  select bc.winner_player_id into v_winner
  from public.buzz_cycles bc
  where bc.id = p_cycle_id;

  return query select false, v_winner;
end;
$$;

create or replace function public.close_buzz_cycle_atomic(p_room_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cycle_id uuid;
begin
  select active_buzz_cycle_id into v_cycle_id
  from public.rooms
  where id = p_room_id and ended_at is null
  for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'ERR_ROOM_NOT_FOUND';
  end if;

  if v_cycle_id is not null then
    update public.buzz_cycles
      set closed_at = coalesce(closed_at, now())
    where id = v_cycle_id;
  end if;

  update public.rooms
    set phase = 'READY'
  where id = p_room_id;

  return v_cycle_id;
end;
$$;

create or replace function public.override_buzz_winner_atomic(
  p_room_id uuid,
  p_player_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cycle_id uuid;
begin
  select active_buzz_cycle_id into v_cycle_id
  from public.rooms
  where id = p_room_id and ended_at is null
  for update;

  if not found or v_cycle_id is null then
    raise exception using errcode = 'P0001', message = 'ERR_NO_ACTIVE_CYCLE';
  end if;

  if not exists (
    select 1 from public.players p
    where p.id = p_player_id
      and p.room_id = p_room_id
      and p.removed_at is null
  ) then
    raise exception using errcode = 'P0001', message = 'ERR_PLAYER_NOT_ELIGIBLE';
  end if;

  update public.buzz_cycles
    set winner_player_id = p_player_id,
        winner_source = 'host',
        winner_received_at = now(),
        closed_at = now()
  where id = v_cycle_id;

  update public.rooms set phase = 'BUZZ_LOCKED' where id = p_room_id;
  return v_cycle_id;
end;
$$;

revoke all on function public.open_buzz_cycle_atomic(uuid) from public;
revoke all on function public.claim_buzz_atomic(uuid, uuid) from public;
revoke all on function public.close_buzz_cycle_atomic(uuid) from public;
revoke all on function public.override_buzz_winner_atomic(uuid, uuid) from public;
grant execute on function public.open_buzz_cycle_atomic(uuid) to service_role;
grant execute on function public.claim_buzz_atomic(uuid, uuid) to service_role;
grant execute on function public.close_buzz_cycle_atomic(uuid) to service_role;
grant execute on function public.override_buzz_winner_atomic(uuid, uuid) to service_role;
