alter table public.score_events
  drop constraint if exists score_events_kind_check;

alter table public.score_events
  add constraint score_events_kind_check
  check (kind in ('answer', 'manual', 'revert'));

alter table public.score_events
  add constraint score_events_revert_shape_check
  check (
    (kind = 'revert' and reverted_event_id is not null)
    or
    (kind in ('answer', 'manual') and reverted_event_id is null)
  );

create unique index score_events_one_revert_per_event
  on public.score_events(reverted_event_id)
  where reverted_event_id is not null;

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
  v_winner uuid;
  v_event_id uuid;
begin
  if p_delta not in (-1, 0, 1) then
    raise exception using errcode = 'P0001', message = 'ERR_INVALID_ANSWER_DELTA';
  end if;

  select bc.winner_player_id
    into v_winner
  from public.buzz_cycles bc
  where bc.id = p_buzz_cycle_id
    and bc.room_id = p_room_id
    and bc.winner_player_id is not null
  for update;

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

create or replace function public.add_manual_score_atomic(
  p_room_id uuid,
  p_player_id uuid,
  p_delta integer,
  p_reason text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event_id uuid;
begin
  if not exists (
    select 1
    from public.rooms r
    join public.players p on p.room_id = r.id
    where r.id = p_room_id
      and r.ended_at is null
      and p.id = p_player_id
      and p.removed_at is null
  ) then
    raise exception using errcode = 'P0001', message = 'ERR_PLAYER_NOT_ELIGIBLE';
  end if;

  insert into public.score_events (
    room_id, player_id, kind, delta, reason
  ) values (
    p_room_id,
    p_player_id,
    'manual',
    p_delta,
    nullif(trim(coalesce(p_reason, '')), '')
  ) returning id into v_event_id;

  return v_event_id;
end;
$$;

create or replace function public.undo_latest_score_atomic(p_room_id uuid)
returns table(revert_event_id uuid, reverted_event_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_target public.score_events%rowtype;
  v_revert_id uuid;
begin
  perform 1
  from public.rooms r
  where r.id = p_room_id and r.ended_at is null
  for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'ERR_ROOM_NOT_FOUND';
  end if;

  select e.*
    into v_target
  from public.score_events e
  where e.room_id = p_room_id
    and e.kind in ('answer', 'manual')
    and not exists (
      select 1 from public.score_events r where r.reverted_event_id = e.id
    )
  order by e.created_at desc, e.id desc
  limit 1
  for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'ERR_NO_SCORE_TO_UNDO';
  end if;

  insert into public.score_events (
    room_id,
    player_id,
    buzz_cycle_id,
    kind,
    delta,
    reason,
    reverted_event_id
  ) values (
    v_target.room_id,
    v_target.player_id,
    v_target.buzz_cycle_id,
    'revert',
    -v_target.delta,
    'Undo: ' || coalesce(v_target.reason, v_target.kind),
    v_target.id
  ) returning id into v_revert_id;

  return query select v_revert_id, v_target.id;
end;
$$;

revoke all on function public.resolve_answer_score_atomic(uuid, uuid, uuid, integer) from public;
revoke all on function public.add_manual_score_atomic(uuid, uuid, integer, text) from public;
revoke all on function public.undo_latest_score_atomic(uuid) from public;

grant execute on function public.resolve_answer_score_atomic(uuid, uuid, uuid, integer) to service_role;
grant execute on function public.add_manual_score_atomic(uuid, uuid, integer, text) to service_role;
grant execute on function public.undo_latest_score_atomic(uuid) to service_role;
