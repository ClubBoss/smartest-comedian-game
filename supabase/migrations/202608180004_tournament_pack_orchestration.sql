create or replace function public.start_league_8_tournament_with_packs_atomic(
  p_room_id uuid,
  p_group_a_player_ids uuid[],
  p_group_b_player_ids uuid[],
  p_qualifier_a_pack_id uuid,
  p_qualifier_b_pack_id uuid,
  p_final_pack_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare v_tournament_id uuid;
begin
  v_tournament_id := public.create_league_8_tournament_atomic(
    p_room_id,
    p_group_a_player_ids,
    p_group_b_player_ids
  );
  perform public.set_tournament_packs_atomic(
    v_tournament_id,
    p_qualifier_a_pack_id,
    p_qualifier_b_pack_id,
    p_final_pack_id
  );
  perform public.queue_tournament_stage_pack_atomic(v_tournament_id, 'qualifier_a');
  return v_tournament_id;
end;
$$;

create or replace function public.advance_league_8_tournament_with_pack_atomic(
  p_tournament_id uuid,
  p_stage text,
  p_advancing_player_ids uuid[]
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare v_next_stage text;
begin
  v_next_stage := public.complete_league_qualifier_atomic(
    p_tournament_id,
    p_stage,
    p_advancing_player_ids
  );
  perform public.queue_tournament_stage_pack_atomic(v_tournament_id, v_next_stage);
  return v_next_stage;
end;
$$;

revoke all on function public.start_league_8_tournament_with_packs_atomic(uuid, uuid[], uuid[], uuid, uuid, uuid) from public;
revoke all on function public.advance_league_8_tournament_with_pack_atomic(uuid, text, uuid[]) from public;
grant execute on function public.start_league_8_tournament_with_packs_atomic(uuid, uuid[], uuid[], uuid, uuid, uuid) to service_role;
grant execute on function public.advance_league_8_tournament_with_pack_atomic(uuid, text, uuid[]) to service_role;
