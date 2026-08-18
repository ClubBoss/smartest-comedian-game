alter table public.room_question_queue
  add column if not exists question_role text not null default 'regular';

alter table public.room_question_queue drop constraint if exists room_question_queue_question_role_check;
alter table public.room_question_queue add constraint room_question_queue_question_role_check
  check (question_role in ('regular', 'qualifier_super', 'team', 'last', 'double_or_nothing', 'tiebreak'));

alter table public.question_sessions
  add column if not exists question_role_snapshot text not null default 'regular';

alter table public.question_sessions drop constraint if exists question_sessions_question_role_snapshot_check;
alter table public.question_sessions add constraint question_sessions_question_role_snapshot_check
  check (question_role_snapshot in ('regular', 'qualifier_super', 'team', 'last', 'double_or_nothing', 'tiebreak'));

create or replace function public.snapshot_game_question_role()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.queue_item_id is null then
    return new;
  end if;

  select q.question_role
    into new.question_role_snapshot
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

  if coalesce(v_role, 'regular') in ('team', 'double_or_nothing') then
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
    select i.question_id, i.question_role
    from public.question_pack_items i
    where i.pack_id = p_pack_id
    order by i.position
  loop
    insert into public.room_question_queue(room_id, question_id, position, state, question_role)
    values (
      p_room_id,
      v_item.question_id,
      v_position,
      'queued',
      coalesce(v_item.question_role, 'regular')
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

create or replace function public.save_question_pack_with_roles_atomic(
  p_pack_id uuid,
  p_name text,
  p_description text,
  p_items jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text := trim(coalesce(p_name, ''));
  v_item jsonb;
  v_question_id uuid;
  v_role text;
  v_position integer := 0;
  v_count integer;
begin
  if p_pack_id is null then
    raise exception using errcode = 'P0001', message = 'ERR_PACK_ID_REQUIRED';
  end if;
  if char_length(v_name) < 1 or char_length(v_name) > 120 then
    raise exception using errcode = 'P0001', message = 'ERR_PACK_NAME_INVALID';
  end if;
  if jsonb_typeof(coalesce(p_items, '[]'::jsonb)) <> 'array' then
    raise exception using errcode = 'P0001', message = 'ERR_PACK_ITEMS_INVALID';
  end if;

  v_count := jsonb_array_length(coalesce(p_items, '[]'::jsonb));
  if v_count < 1 then
    raise exception using errcode = 'P0001', message = 'ERR_PACK_EMPTY';
  end if;
  if v_count > 100 then
    raise exception using errcode = 'P0001', message = 'ERR_PACK_TOO_LARGE';
  end if;

  if (
    select count(distinct item->>'questionId')
    from jsonb_array_elements(p_items) item
  ) <> v_count then
    raise exception using errcode = 'P0001', message = 'ERR_PACK_DUPLICATE_QUESTION';
  end if;

  for v_item in select value from jsonb_array_elements(p_items) loop
    begin
      v_question_id := (v_item->>'questionId')::uuid;
    exception when others then
      raise exception using errcode = 'P0001', message = 'ERR_PACK_ITEMS_INVALID';
    end;
    v_role := coalesce(nullif(v_item->>'role', ''), 'regular');
    if v_role not in ('regular', 'qualifier_super', 'team', 'last', 'double_or_nothing', 'tiebreak') then
      raise exception using errcode = 'P0001', message = 'ERR_PACK_ROLE_INVALID';
    end if;
    if not exists (select 1 from public.questions q where q.id = v_question_id and q.status = 'ready') then
      raise exception using errcode = 'P0001', message = 'ERR_QUESTION_NOT_READY';
    end if;
  end loop;

  insert into public.question_packs(id, name, description, created_at, updated_at)
  values (p_pack_id, v_name, nullif(trim(coalesce(p_description, '')), ''), now(), now())
  on conflict (id) do update set
    name = excluded.name,
    description = excluded.description,
    updated_at = now();

  delete from public.question_pack_items where pack_id = p_pack_id;

  for v_item in select value from jsonb_array_elements(p_items) loop
    v_question_id := (v_item->>'questionId')::uuid;
    v_role := coalesce(nullif(v_item->>'role', ''), 'regular');
    insert into public.question_pack_items(pack_id, question_id, position, question_role)
    values (p_pack_id, v_question_id, v_position, v_role);
    v_position := v_position + 1;
  end loop;

  return p_pack_id;
end;
$$;

revoke all on function public.queue_question_pack_with_roles_atomic(uuid, uuid) from public;
revoke all on function public.save_question_pack_with_roles_atomic(uuid, text, text, jsonb) from public;

grant execute on function public.queue_question_pack_with_roles_atomic(uuid, uuid) to service_role;
grant execute on function public.save_question_pack_with_roles_atomic(uuid, text, text, jsonb) to service_role;