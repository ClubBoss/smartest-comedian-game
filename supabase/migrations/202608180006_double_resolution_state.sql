alter table public.tournament_nights
  add column if not exists double_resolved boolean not null default false;

create or replace function public.resolve_double_or_nothing_atomic(
  p_tournament_id uuid,
  p_risk boolean,
  p_correct boolean default null
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare v_prize integer; v_payout integer; v_already_resolved boolean;
begin
  select base_prize + team_bonus, double_resolved
    into v_prize, v_already_resolved
  from public.tournament_nights
  where id = p_tournament_id and status = 'completed' and champion_player_id is not null
  for update;
  if v_prize is null then raise exception using errcode = 'P0001', message = 'ERR_TOURNAMENT_NOT_COMPLETE'; end if;
  if v_already_resolved then raise exception using errcode = 'P0001', message = 'ERR_DOUBLE_ALREADY_RESOLVED'; end if;

  if not p_risk then
    v_payout := v_prize;
  else
    if p_correct is null then raise exception using errcode = 'P0001', message = 'ERR_DOUBLE_RESULT_REQUIRED'; end if;
    v_payout := case when p_correct then v_prize * 2 else 0 end;
  end if;

  update public.tournament_nights
  set double_attempted = p_risk,
      double_correct = case when p_risk then p_correct else null end,
      double_resolved = true,
      final_payout = v_payout
  where id = p_tournament_id;
  return v_payout;
end;
$$;
