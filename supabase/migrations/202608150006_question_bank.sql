insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'question-images',
  'question-images',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.save_question_atomic(
  p_question_id uuid,
  p_prompt text,
  p_answer text,
  p_answer_variants jsonb,
  p_explanation text,
  p_host_notes text,
  p_category text,
  p_difficulty smallint,
  p_source_label text,
  p_source_url text,
  p_status text,
  p_hints jsonb,
  p_tags jsonb,
  p_assets jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_asset jsonb;
  v_hint text;
  v_tag text;
  v_position integer;
begin
  if p_question_id is null then
    raise exception using errcode = 'P0001', message = 'ERR_QUESTION_ID_REQUIRED';
  end if;

  if nullif(trim(coalesce(p_answer, '')), '') is null then
    raise exception using errcode = 'P0001', message = 'ERR_ANSWER_REQUIRED';
  end if;

  if p_status not in ('draft', 'ready', 'archived') then
    raise exception using errcode = 'P0001', message = 'ERR_INVALID_STATUS';
  end if;

  if p_difficulty is not null and (p_difficulty < 1 or p_difficulty > 5) then
    raise exception using errcode = 'P0001', message = 'ERR_INVALID_DIFFICULTY';
  end if;

  if nullif(trim(coalesce(p_prompt, '')), '') is null
     and jsonb_array_length(coalesce(p_assets, '[]'::jsonb)) = 0 then
    raise exception using errcode = 'P0001', message = 'ERR_STIMULUS_REQUIRED';
  end if;

  insert into public.questions (
    id, prompt, answer, answer_variants, explanation, host_notes,
    category, difficulty, source_label, source_url, status, created_at, updated_at
  ) values (
    p_question_id,
    nullif(trim(coalesce(p_prompt, '')), ''),
    trim(p_answer),
    coalesce(p_answer_variants, '[]'::jsonb),
    nullif(trim(coalesce(p_explanation, '')), ''),
    nullif(trim(coalesce(p_host_notes, '')), ''),
    nullif(trim(coalesce(p_category, '')), ''),
    p_difficulty,
    nullif(trim(coalesce(p_source_label, '')), ''),
    nullif(trim(coalesce(p_source_url, '')), ''),
    p_status,
    now(),
    now()
  )
  on conflict (id) do update set
    prompt = excluded.prompt,
    answer = excluded.answer,
    answer_variants = excluded.answer_variants,
    explanation = excluded.explanation,
    host_notes = excluded.host_notes,
    category = excluded.category,
    difficulty = excluded.difficulty,
    source_label = excluded.source_label,
    source_url = excluded.source_url,
    status = excluded.status,
    updated_at = now();

  delete from public.question_hints where question_id = p_question_id;
  v_position := 0;
  for v_hint in select value #>> '{}' from jsonb_array_elements(coalesce(p_hints, '[]'::jsonb))
  loop
    if nullif(trim(coalesce(v_hint, '')), '') is not null then
      insert into public.question_hints(question_id, position, text)
      values (p_question_id, v_position, trim(v_hint));
      v_position := v_position + 1;
    end if;
  end loop;

  delete from public.question_tags where question_id = p_question_id;
  for v_tag in
    select distinct trim(value #>> '{}')
    from jsonb_array_elements(coalesce(p_tags, '[]'::jsonb))
    where nullif(trim(value #>> '{}'), '') is not null
  loop
    insert into public.question_tags(question_id, tag) values (p_question_id, v_tag);
  end loop;

  delete from public.question_assets where question_id = p_question_id;
  v_position := 0;
  for v_asset in select value from jsonb_array_elements(coalesce(p_assets, '[]'::jsonb))
  loop
    if coalesce(v_asset->>'asset_type', 'image') <> 'image'
       or nullif(trim(coalesce(v_asset->>'storage_path', '')), '') is null
       or nullif(trim(coalesce(v_asset->>'mime_type', '')), '') is null then
      raise exception using errcode = 'P0001', message = 'ERR_INVALID_ASSET';
    end if;

    insert into public.question_assets(
      question_id, asset_type, position, storage_path, mime_type,
      alt_text, caption, width, height
    ) values (
      p_question_id,
      'image',
      v_position,
      v_asset->>'storage_path',
      v_asset->>'mime_type',
      nullif(trim(coalesce(v_asset->>'alt_text', '')), ''),
      nullif(trim(coalesce(v_asset->>'caption', '')), ''),
      nullif(v_asset->>'width', '')::integer,
      nullif(v_asset->>'height', '')::integer
    );
    v_position := v_position + 1;
  end loop;

  return p_question_id;
end;
$$;

revoke all on function public.save_question_atomic(uuid, text, text, jsonb, text, text, text, smallint, text, text, text, jsonb, jsonb, jsonb) from public;
grant execute on function public.save_question_atomic(uuid, text, text, jsonb, text, text, text, smallint, text, text, text, jsonb, jsonb, jsonb) to service_role;
