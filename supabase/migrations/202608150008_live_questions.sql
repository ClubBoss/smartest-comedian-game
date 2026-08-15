alter table public.question_sessions
  add column queue_item_id uuid null references public.room_question_queue(id) on delete set null;

create index question_sessions_queue_item_id_idx
  on public.question_sessions(queue_item_id);

create or replace function public.queue_question_atomic(
  p_room_id uuid,
  p_question_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_position integer;
  v_item_id uuid;
begin
  perform 1 from public.rooms r
  where r.id = p_room_id and r.ended_at is null
  for update;
  if not found then
    raise exception using errcode = 'P0001', message = 'ERR_ROOM_NOT_FOUND';
  end if;

  if not exists (
    select 1 from public.questions q
    where q.id = p_question_id and q.status = 'ready'
  ) then
    raise exception using errcode = 'P0001', message = 'ERR_QUESTION_NOT_READY';
  end if;

  select coalesce(max(position), -1) + 1 into v_position
  from public.room_question_queue
  where room_id = p_room_id;

  insert into public.room_question_queue(room_id, question_id, position, state)
  values (p_room_id, p_question_id, v_position, 'queued')
  returning id into v_item_id;

  return v_item_id;
end;
$$;

create or replace function public.move_queue_item_atomic(
  p_room_id uuid,
  p_item_id uuid,
  p_direction integer
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_position integer;
  v_other_id uuid;
  v_other_position integer;
  v_temp_position integer;
begin
  if p_direction not in (-1, 1) then
    raise exception using errcode = 'P0001', message = 'ERR_INVALID_DIRECTION';
  end if;

  perform 1 from public.rooms r
  where r.id = p_room_id and r.ended_at is null
  for update;
  if not found then
    raise exception using errcode = 'P0001', message = 'ERR_ROOM_NOT_FOUND';
  end if;

  select q.position into v_position
  from public.room_question_queue q
  where q.id = p_item_id and q.room_id = p_room_id and q.state = 'queued'
  for update;
  if not found then
    raise exception using errcode = 'P0001', message = 'ERR_QUEUE_ITEM_NOT_FOUND';
  end if;

  if p_direction = -1 then
    select q.id, q.position into v_other_id, v_other_position
    from public.room_question_queue q
    where q.room_id = p_room_id and q.state = 'queued' and q.position < v_position
    order by q.position desc limit 1 for update;
  else
    select q.id, q.position into v_other_id, v_other_position
    from public.room_question_queue q
    where q.room_id = p_room_id and q.state = 'queued' and q.position > v_position
    order by q.position asc limit 1 for update;
  end if;

  if v_other_id is null then return false; end if;

  select coalesce(max(position), 0) + 1000000 into v_temp_position
  from public.room_question_queue where room_id = p_room_id;

  update public.room_question_queue set position = v_temp_position where id = p_item_id;
  update public.room_question_queue set position = v_position where id = v_other_id;
  update public.room_question_queue set position = v_other_position where id = p_item_id;
  return true;
end;
$$;

create or replace function public.skip_queue_item_atomic(
  p_room_id uuid,
  p_item_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
begin
  perform 1 from public.rooms r
  where r.id = p_room_id and r.ended_at is null
  for update;
  if not found then
    raise exception using errcode = 'P0001', message = 'ERR_ROOM_NOT_FOUND';
  end if;

  update public.room_question_queue
    set state = 'skipped'
  where id = p_item_id and room_id = p_room_id and state = 'queued';
  if not found then
    raise exception using errcode = 'P0001', message = 'ERR_QUEUE_ITEM_NOT_FOUND';
  end if;
  return p_item_id;
end;
$$;

create or replace function public.start_question_atomic(
  p_room_id uuid,
  p_question_id uuid,
  p_queue_item_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current uuid;
  v_active_buzz uuid;
  v_session_id uuid;
  v_prompt text;
  v_answer text;
  v_variants jsonb;
  v_explanation text;
  v_host_notes text;
  v_hints jsonb;
  v_assets jsonb;
begin
  select current_question_session_id, active_buzz_cycle_id
    into v_current, v_active_buzz
  from public.rooms r
  where r.id = p_room_id and r.ended_at is null
  for update;

  if not found then
    raise exception using errcode = 'P0001', message = 'ERR_ROOM_NOT_FOUND';
  end if;

  if v_current is not null and exists (
    select 1 from public.question_sessions s where s.id = v_current and s.ended_at is null
  ) then
    raise exception using errcode = 'P0001', message = 'ERR_QUESTION_ACTIVE';
  end if;

  select q.prompt, q.answer, q.answer_variants, q.explanation, q.host_notes
    into v_prompt, v_answer, v_variants, v_explanation, v_host_notes
  from public.questions q
  where q.id = p_question_id and q.status = 'ready';
  if not found then
    raise exception using errcode = 'P0001', message = 'ERR_QUESTION_NOT_READY';
  end if;

  if p_queue_item_id is not null and not exists (
    select 1 from public.room_question_queue qi
    where qi.id = p_queue_item_id
      and qi.room_id = p_room_id
      and qi.question_id = p_question_id
      and qi.state = 'queued'
  ) then
    raise exception using errcode = 'P0001', message = 'ERR_QUEUE_ITEM_NOT_FOUND';
  end if;

  select coalesce(jsonb_agg(h.text order by h.position), '[]'::jsonb)
    into v_hints
  from public.question_hints h
  where h.question_id = p_question_id;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'storage_path', a.storage_path,
        'mime_type', a.mime_type,
        'alt_text', a.alt_text,
        'caption', a.caption,
        'width', a.width,
        'height', a.height
      ) order by a.position
    ),
    '[]'::jsonb
  ) into v_assets
  from public.question_assets a
  where a.question_id = p_question_id;

  if v_active_buzz is not null then
    update public.buzz_cycles set closed_at = coalesce(closed_at, now()) where id = v_active_buzz;
  end if;

  insert into public.question_sessions(
    room_id,
    source_question_id,
    queue_item_id,
    prompt_snapshot,
    answer_snapshot,
    answer_variants_snapshot,
    explanation_snapshot,
    host_notes_snapshot,
    hints_snapshot,
    assets_snapshot,
    stimulus_revealed,
    revealed_hint_count,
    answer_revealed
  ) values (
    p_room_id,
    p_question_id,
    p_queue_item_id,
    v_prompt,
    v_answer,
    coalesce(v_variants, '[]'::jsonb),
    v_explanation,
    v_host_notes,
    coalesce(v_hints, '[]'::jsonb),
    coalesce(v_assets, '[]'::jsonb),
    false,
    0,
    false
  ) returning id into v_session_id;

  update public.rooms
    set current_question_session_id = v_session_id,
        active_buzz_cycle_id = null,
        phase = 'QUESTION'
  where id = p_room_id;

  return v_session_id;
end;
$$;

create or replace function public.start_next_queued_question_atomic(p_room_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_item_id uuid;
  v_question_id uuid;
begin
  select qi.id, qi.question_id into v_item_id, v_question_id
  from public.room_question_queue qi
  where qi.room_id = p_room_id and qi.state = 'queued' and qi.question_id is not null
  order by qi.position asc
  limit 1;

  if v_item_id is null then
    raise exception using errcode = 'P0001', message = 'ERR_QUEUE_EMPTY';
  end if;

  return public.start_question_atomic(p_room_id, v_question_id, v_item_id);
end;
$$;

create or replace function public.reveal_question_stimulus_atomic(p_room_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare v_session uuid;
begin
  select current_question_session_id into v_session
  from public.rooms r
  where r.id = p_room_id and r.ended_at is null
  for update;
  if v_session is null then
    raise exception using errcode = 'P0001', message = 'ERR_NO_ACTIVE_QUESTION';
  end if;

  update public.question_sessions set stimulus_revealed = true
  where id = v_session and ended_at is null;
  if not found then
    raise exception using errcode = 'P0001', message = 'ERR_NO_ACTIVE_QUESTION';
  end if;

  update public.rooms set phase = 'QUESTION' where id = p_room_id;
  return v_session;
end;
$$;

create or replace function public.reveal_next_hint_atomic(p_room_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session uuid;
  v_current integer;
  v_total integer;
begin
  select current_question_session_id into v_session
  from public.rooms r
  where r.id = p_room_id and r.ended_at is null
  for update;
  if v_session is null then
    raise exception using errcode = 'P0001', message = 'ERR_NO_ACTIVE_QUESTION';
  end if;

  select revealed_hint_count, jsonb_array_length(hints_snapshot)
    into v_current, v_total
  from public.question_sessions
  where id = v_session and ended_at is null and stimulus_revealed = true
  for update;
  if not found then
    raise exception using errcode = 'P0001', message = 'ERR_STIMULUS_HIDDEN';
  end if;

  if v_current >= v_total then
    raise exception using errcode = 'P0001', message = 'ERR_NO_MORE_HINTS';
  end if;

  update public.question_sessions
    set revealed_hint_count = v_current + 1
  where id = v_session;
  return v_current + 1;
end;
$$;

create or replace function public.reveal_question_answer_atomic(p_room_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare v_session uuid;
begin
  select current_question_session_id into v_session
  from public.rooms r
  where r.id = p_room_id and r.ended_at is null
  for update;
  if v_session is null then
    raise exception using errcode = 'P0001', message = 'ERR_NO_ACTIVE_QUESTION';
  end if;

  update public.question_sessions
    set stimulus_revealed = true, answer_revealed = true
  where id = v_session and ended_at is null;
  if not found then
    raise exception using errcode = 'P0001', message = 'ERR_NO_ACTIVE_QUESTION';
  end if;

  update public.rooms set phase = 'REVEAL' where id = p_room_id;
  return v_session;
end;
$$;

create or replace function public.finish_question_atomic(p_room_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session uuid;
  v_queue_item uuid;
  v_cycle uuid;
begin
  select current_question_session_id, active_buzz_cycle_id
    into v_session, v_cycle
  from public.rooms r
  where r.id = p_room_id and r.ended_at is null
  for update;
  if v_session is null then
    raise exception using errcode = 'P0001', message = 'ERR_NO_ACTIVE_QUESTION';
  end if;

  select queue_item_id into v_queue_item
  from public.question_sessions
  where id = v_session and ended_at is null
  for update;
  if not found then
    raise exception using errcode = 'P0001', message = 'ERR_NO_ACTIVE_QUESTION';
  end if;

  if v_cycle is not null then
    update public.buzz_cycles set closed_at = coalesce(closed_at, now()) where id = v_cycle;
  end if;

  update public.question_sessions set ended_at = now() where id = v_session;
  if v_queue_item is not null then
    update public.room_question_queue set state = 'played'
    where id = v_queue_item and room_id = p_room_id;
  end if;

  update public.rooms
    set current_question_session_id = null,
        active_buzz_cycle_id = null,
        phase = 'READY'
  where id = p_room_id;

  return v_session;
end;
$$;

-- Buzzer integration: a preloaded question must be revealed before buzzing.
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
  v_stimulus_revealed boolean;
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

  if v_question_session is not null then
    select stimulus_revealed into v_stimulus_revealed
    from public.question_sessions
    where id = v_question_session and ended_at is null;
    if coalesce(v_stimulus_revealed, false) = false then
      raise exception using errcode = 'P0001', message = 'ERR_STIMULUS_HIDDEN';
    end if;
  end if;

  if v_previous_cycle is not null then
    update public.buzz_cycles set closed_at = coalesce(closed_at, now()) where id = v_previous_cycle;
  end if;

  insert into public.buzz_cycles(room_id, question_session_id)
  values (p_room_id, v_question_session)
  returning id into v_cycle_id;

  update public.rooms set active_buzz_cycle_id = v_cycle_id, phase = 'BUZZ_OPEN'
  where id = p_room_id;
  return v_cycle_id;
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
  v_session uuid;
  v_answer_revealed boolean;
begin
  select active_buzz_cycle_id, current_question_session_id into v_cycle_id, v_session
  from public.rooms
  where id = p_room_id and ended_at is null
  for update;
  if not found then
    raise exception using errcode = 'P0001', message = 'ERR_ROOM_NOT_FOUND';
  end if;

  if v_cycle_id is not null then
    update public.buzz_cycles set closed_at = coalesce(closed_at, now()) where id = v_cycle_id;
  end if;

  if v_session is not null then
    select answer_revealed into v_answer_revealed
    from public.question_sessions where id = v_session and ended_at is null;
  end if;

  update public.rooms
    set phase = case when v_session is null then 'READY'
                     when coalesce(v_answer_revealed, false) then 'REVEAL'
                     else 'QUESTION' end
  where id = p_room_id;
  return v_cycle_id;
end;
$$;

revoke all on function public.queue_question_atomic(uuid, uuid) from public;
revoke all on function public.move_queue_item_atomic(uuid, uuid, integer) from public;
revoke all on function public.skip_queue_item_atomic(uuid, uuid) from public;
revoke all on function public.start_question_atomic(uuid, uuid, uuid) from public;
revoke all on function public.start_next_queued_question_atomic(uuid) from public;
revoke all on function public.reveal_question_stimulus_atomic(uuid) from public;
revoke all on function public.reveal_next_hint_atomic(uuid) from public;
revoke all on function public.reveal_question_answer_atomic(uuid) from public;
revoke all on function public.finish_question_atomic(uuid) from public;

grant execute on function public.queue_question_atomic(uuid, uuid) to service_role;
grant execute on function public.move_queue_item_atomic(uuid, uuid, integer) to service_role;
grant execute on function public.skip_queue_item_atomic(uuid, uuid) to service_role;
grant execute on function public.start_question_atomic(uuid, uuid, uuid) to service_role;
grant execute on function public.start_next_queued_question_atomic(uuid) to service_role;
grant execute on function public.reveal_question_stimulus_atomic(uuid) to service_role;
grant execute on function public.reveal_next_hint_atomic(uuid) to service_role;
grant execute on function public.reveal_question_answer_atomic(uuid) to service_role;
grant execute on function public.finish_question_atomic(uuid) to service_role;

grant execute on function public.open_buzz_cycle_atomic(uuid) to service_role;
grant execute on function public.close_buzz_cycle_atomic(uuid) to service_role;
