begin;

select plan(14);

select has_table('public', 'rooms', 'rooms table exists');
select has_table('public', 'question_assets', 'question assets table exists');
select has_table('public', 'buzz_cycles', 'buzz cycles table exists');
select has_column('public', 'question_sessions', 'assets_snapshot', 'live question snapshots include media');
select has_column('public', 'questions', 'answer_variants', 'questions include acceptable answer variants');
select has_column('public', 'question_sessions', 'stimulus_revealed', 'question stimulus has explicit reveal state');
select has_column('public', 'score_events', 'buzz_cycle_id', 'answer scoring can reference its buzz cycle');

select lives_ok(
  $$insert into rooms (code, host_secret_hash, capacity) values ('R002', 'hash', 2)$$,
  'room capacity 2 is accepted'
);

select lives_ok(
  $$insert into rooms (code, host_secret_hash, capacity) values ('R010', 'hash', 10)$$,
  'room capacity 10 is accepted'
);

select throws_ok(
  $$insert into rooms (code, host_secret_hash, capacity) values ('R001', 'hash', 1)$$,
  '23514',
  null,
  'room capacity 1 is rejected'
);

select throws_ok(
  $$insert into rooms (code, host_secret_hash, capacity) values ('R011', 'hash', 11)$$,
  '23514',
  null,
  'room capacity 11 is rejected'
);

select lives_ok(
  $$insert into players (room_id, display_name, sound_type, sound_key, seat_order, reconnect_token_hash)
    select id, 'Builtin Player', 'builtin', 'duck', 1, 'reconnect-1' from rooms where code = 'R002'$$,
  'built-in individual buzzer sound is accepted'
);

select lives_ok(
  $$insert into players (room_id, display_name, sound_type, custom_sound_path, custom_sound_mime_type, seat_order, reconnect_token_hash)
    select id, 'Custom Player', 'custom', 'sounds/custom-player.wav', 'audio/wav', 2, 'reconnect-2' from rooms where code = 'R002'$$,
  'custom uploaded buzzer sound metadata is accepted'
);

insert into buzz_cycles (room_id)
select id from rooms where code = 'R002';

select lives_ok(
  $$insert into score_events (room_id, player_id, buzz_cycle_id, kind, delta)
    select r.id, p.id, b.id, 'answer', 0
    from rooms r
    join players p on p.room_id = r.id and p.display_name = 'Builtin Player'
    join buzz_cycles b on b.room_id = r.id
    where r.code = 'R002'$$,
  'zero-value answer resolution linked to a buzz cycle is accepted'
);

select * from finish();
rollback;
