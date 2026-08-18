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
  v_tournament_id uuid;
  v_tournament_stage text;
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

  select tn.id, tn.current_stage
    into v_tournament_id, v_tournament_stage
  from public.tournament_nights tn
  where tn.room_id = v_room_id
    and tn.status = 'active'
    and tn.current_stage in ('qualifier_a', 'qualifier_b', 'final');

  if v_tournament_id is not null and not exists (
    select 1
    from public.tournament_stage_members m
    where m.tournament_id = v_tournament_id
      and m.stage = v_tournament_stage
      and m.player_id = p_player_id
  ) then
    raise exception using errcode = 'P0001', message = 'ERR_TOURNAMENT_PLAYER_INACTIVE';
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

revoke all on function public.claim_buzz_atomic(uuid, uuid) from public;
grant execute on function public.claim_buzz_atomic(uuid, uuid) to service_role;
