alter table public.score_events
  add column event_seq bigint generated always as identity;

create unique index score_events_event_seq_unique
  on public.score_events(event_seq);

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
  order by e.event_seq desc
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

revoke all on function public.undo_latest_score_atomic(uuid) from public;
grant execute on function public.undo_latest_score_atomic(uuid) to service_role;
