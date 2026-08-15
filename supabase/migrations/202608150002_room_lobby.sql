create or replace function public.join_room_atomic(
  p_code text,
  p_display_name text,
  p_sound_key text,
  p_reconnect_token_hash text
)
returns table(player_id uuid, seat_number smallint)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_room_id uuid;
  v_capacity smallint;
  v_seat smallint;
  v_player_id uuid;
begin
  select id, capacity
    into v_room_id, v_capacity
  from public.rooms
  where code = upper(trim(p_code))
    and ended_at is null
  for update;

  if v_room_id is null then
    raise exception using errcode = 'P0001', message = 'ERR_ROOM_NOT_FOUND';
  end if;

  if char_length(trim(p_display_name)) < 1 or char_length(trim(p_display_name)) > 40 then
    raise exception using errcode = 'P0001', message = 'ERR_INVALID_NAME';
  end if;

  if (select count(*) from public.players where room_id = v_room_id and removed_at is null) >= v_capacity then
    raise exception using errcode = 'P0001', message = 'ERR_ROOM_FULL';
  end if;

  if exists (
    select 1 from public.players
    where room_id = v_room_id
      and removed_at is null
      and sound_type = 'builtin'
      and sound_key = p_sound_key
  ) then
    raise exception using errcode = 'P0001', message = 'ERR_SOUND_TAKEN';
  end if;

  select candidate::smallint
    into v_seat
  from generate_series(1, v_capacity) as candidate
  where not exists (
    select 1 from public.players
    where room_id = v_room_id
      and removed_at is null
      and seat_order = candidate
  )
  order by candidate
  limit 1;

  if v_seat is null then
    raise exception using errcode = 'P0001', message = 'ERR_ROOM_FULL';
  end if;

  insert into public.players (
    room_id,
    display_name,
    sound_type,
    sound_key,
    seat_order,
    reconnect_token_hash
  ) values (
    v_room_id,
    trim(p_display_name),
    'builtin',
    p_sound_key,
    v_seat,
    p_reconnect_token_hash
  ) returning id into v_player_id;

  return query select v_player_id, v_seat;
end;
$$;

revoke all on function public.join_room_atomic(text, text, text, text) from public;
grant execute on function public.join_room_atomic(text, text, text, text) to service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'buzzer-sounds',
  'buzzer-sounds',
  false,
  1572864,
  array['audio/mpeg', 'audio/wav', 'audio/x-wav', 'audio/ogg', 'audio/mp4']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
