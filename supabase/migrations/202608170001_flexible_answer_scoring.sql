create or replace function public.resolve_answer_score_atomic(
  p_room_id uuid,
  p_player_id uuid,
  p_buzz_cycle_id uuid,
  p_delta integer
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_active_cycle uuid;
  v_winner uuid;
  v_event_id uuid;
begin
  if p_delta is null or p_delta < -99 or p_delta > 99 then
    raise exception using errcode = 'P0001', message = 'ERR_INVALID_ANSWER_DELTA';
  end if;

  select r.active_buzz_cycle_id
    into v_active_cycle
  from public.rooms r
  where r.id = p_room_id and r.ended_at is null
  for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'ERR_ROOM_NOT_FOUND';
  end if;

  if v_active_cycle is distinct from p_buzz_cycle_id then
    raise exception using errcode = 'P0001', message = 'ERR_STALE_CYCLE';
  end if;

  select bc.winner_player_id
    into v_winner
  from public.buzz_cycles bc
  where bc.id = p_buzz_cycle_id
    and bc.room_id = p_room_id
    and bc.winner_player_id is not null;

  if not found then
    raise exception using errcode = 'P0001', message = 'ERR_BUZZ_NOT_RESOLVABLE';
  end if;

  if v_winner <> p_player_id then
    raise exception using errcode = 'P0001', message = 'ERR_PLAYER_NOT_WINNER';
  end if;

  if exists (
    select 1
    from public.score_events e
    where e.room_id = p_room_id
      and e.buzz_cycle_id = p_buzz_cycle_id
      and e.kind = 'answer'
      and not exists (
        select 1 from public.score_events r where r.reverted_event_id = e.id
      )
  ) then
    raise exception using errcode = 'P0001', message = 'ERR_CYCLE_ALREADY_SCORED';
  end if;

  insert into public.score_events (
    room_id, player_id, buzz_cycle_id, kind, delta, reason
  ) values (
    p_room_id, p_player_id, p_buzz_cycle_id, 'answer', p_delta, 'Answer resolution'
  ) returning id into v_event_id;

  return v_event_id;
end;
$$;

revoke all on function public.resolve_answer_score_atomic(uuid, uuid, uuid, integer) from public;
grant execute on function public.resolve_answer_score_atomic(uuid, uuid, uuid, integer) to service_role;
