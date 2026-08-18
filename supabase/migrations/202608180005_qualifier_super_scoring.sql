alter table public.special_answer_submissions
  add column if not exists awarded_points integer null,
  add column if not exists awarded_at timestamptz null;

create or replace function public.award_qualifier_super_atomic(
  p_question_session_id uuid,
  p_player_id uuid,
  p_correct boolean
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_room_id uuid;
  v_role text;
  v_hint_count integer;
  v_schedule jsonb;
  v_points integer;
begin
  select s.room_id, s.question_role_snapshot, s.revealed_hint_count, s.hint_point_schedule_snapshot
    into v_room_id, v_role, v_hint_count, v_schedule
  from public.question_sessions s
  where s.id = p_question_session_id and s.ended_at is null
  for update;

  if not found then raise exception using errcode = 'P0001', message = 'ERR_NO_ACTIVE_QUESTION'; end if;
  if v_role <> 'qualifier_super' then raise exception using errcode = 'P0001', message = 'ERR_SPECIAL_ANSWER_ROLE'; end if;

  perform 1 from public.special_answer_submissions a
  where a.question_session_id = p_question_session_id
    and a.player_id = p_player_id
    and a.awarded_at is null
  for update;
  if not found then raise exception using errcode = 'P0001', message = 'ERR_SPECIAL_ANSWER_NOT_PENDING'; end if;

  if p_correct then
    if jsonb_array_length(coalesce(v_schedule, '[]'::jsonb)) = 0 then
      v_schedule := '[3,2,1,0]'::jsonb;
    end if;
    v_points := coalesce((v_schedule ->> least(v_hint_count, jsonb_array_length(v_schedule) - 1))::integer, 0);
  else
    v_points := 0;
  end if;

  if v_points <> 0 then
    perform public.add_manual_score_atomic(v_room_id, p_player_id, v_points, 'Qualifier Super');
  end if;

  update public.special_answer_submissions
  set awarded_points = v_points, awarded_at = now()
  where question_session_id = p_question_session_id and player_id = p_player_id;

  return v_points;
end;
$$;

revoke all on function public.award_qualifier_super_atomic(uuid, uuid, boolean) from public;
grant execute on function public.award_qualifier_super_atomic(uuid, uuid, boolean) to service_role;
grant update on public.special_answer_submissions to service_role;
