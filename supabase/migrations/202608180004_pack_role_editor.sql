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
    insert into public.question_pack_items(
      pack_id, question_id, position, question_role, correct_points, wrong_points
    ) values (
      p_pack_id,
      v_question_id,
      v_position,
      v_role,
      case v_role
        when 'qualifier_super' then 3
        when 'last' then 2
        when 'regular' then 1
        when 'tiebreak' then 1
        else null
      end,
      case v_role
        when 'qualifier_super' then 0
        when 'team' then 0
        when 'double_or_nothing' then 0
        else -1
      end
    );
    v_position := v_position + 1;
  end loop;

  return p_pack_id;
end;
$$;

revoke all on function public.save_question_pack_with_roles_atomic(uuid, text, text, jsonb) from public;
grant execute on function public.save_question_pack_with_roles_atomic(uuid, text, text, jsonb) to service_role;