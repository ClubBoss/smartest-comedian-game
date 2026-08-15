create table if not exists public.question_packs (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 1 and 120),
  description text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.question_pack_items (
  pack_id uuid not null references public.question_packs(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete restrict,
  position integer not null check (position >= 0),
  primary key (pack_id, question_id),
  unique (pack_id, position)
);

create index if not exists question_pack_items_question_id_idx
  on public.question_pack_items(question_id);

revoke all on table public.question_packs from anon, authenticated;
revoke all on table public.question_pack_items from anon, authenticated;

create or replace function public.save_question_pack_atomic(
  p_pack_id uuid,
  p_name text,
  p_description text,
  p_question_ids uuid[]
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text := trim(coalesce(p_name, ''));
  v_question_id uuid;
  v_position integer := 0;
begin
  if p_pack_id is null then
    raise exception using errcode = 'P0001', message = 'ERR_PACK_ID_REQUIRED';
  end if;
  if char_length(v_name) < 1 or char_length(v_name) > 120 then
    raise exception using errcode = 'P0001', message = 'ERR_PACK_NAME_INVALID';
  end if;
  if coalesce(array_length(p_question_ids, 1), 0) < 1 then
    raise exception using errcode = 'P0001', message = 'ERR_PACK_EMPTY';
  end if;
  if coalesce(array_length(p_question_ids, 1), 0) > 100 then
    raise exception using errcode = 'P0001', message = 'ERR_PACK_TOO_LARGE';
  end if;
  if (
    select count(distinct input.id)
    from unnest(p_question_ids) as input(id)
  ) <> coalesce(array_length(p_question_ids, 1), 0) then
    raise exception using errcode = 'P0001', message = 'ERR_PACK_DUPLICATE_QUESTION';
  end if;
  if exists (
    select 1
    from unnest(p_question_ids) as input(question_id)
    left join public.questions q on q.id = input.question_id
    where q.id is null or q.status <> 'ready'
  ) then
    raise exception using errcode = 'P0001', message = 'ERR_QUESTION_NOT_READY';
  end if;

  insert into public.question_packs(id, name, description, created_at, updated_at)
  values (p_pack_id, v_name, nullif(trim(coalesce(p_description, '')), ''), now(), now())
  on conflict (id) do update set
    name = excluded.name,
    description = excluded.description,
    updated_at = now();

  delete from public.question_pack_items where pack_id = p_pack_id;
  foreach v_question_id in array p_question_ids loop
    insert into public.question_pack_items(pack_id, question_id, position)
    values (p_pack_id, v_question_id, v_position);
    v_position := v_position + 1;
  end loop;

  return p_pack_id;
end;
$$;

revoke all on function public.save_question_pack_atomic(uuid, text, text, uuid[]) from public;
grant execute on function public.save_question_pack_atomic(uuid, text, text, uuid[]) to service_role;

create or replace function public.queue_questions_atomic(
  p_room_id uuid,
  p_question_ids uuid[]
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_position integer;
  v_question_id uuid;
  v_count integer := 0;
begin
  perform 1 from public.rooms r
  where r.id = p_room_id and r.ended_at is null
  for update;
  if not found then
    raise exception using errcode = 'P0001', message = 'ERR_ROOM_NOT_FOUND';
  end if;

  if coalesce(array_length(p_question_ids, 1), 0) < 1 then
    raise exception using errcode = 'P0001', message = 'ERR_PACK_EMPTY';
  end if;

  if exists (
    select 1
    from unnest(p_question_ids) as input(question_id)
    left join public.questions q on q.id = input.question_id
    where q.id is null or q.status <> 'ready'
  ) then
    raise exception using errcode = 'P0001', message = 'ERR_QUESTION_NOT_READY';
  end if;

  select coalesce(max(position), -1) + 1 into v_position
  from public.room_question_queue
  where room_id = p_room_id;

  foreach v_question_id in array p_question_ids loop
    insert into public.room_question_queue(room_id, question_id, position, state)
    values (p_room_id, v_question_id, v_position, 'queued');
    v_position := v_position + 1;
    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$$;

revoke all on function public.queue_questions_atomic(uuid, uuid[]) from public;
grant execute on function public.queue_questions_atomic(uuid, uuid[]) to service_role;
