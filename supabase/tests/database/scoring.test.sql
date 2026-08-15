begin;

select plan(16);

select has_function('public', 'resolve_answer_score_atomic', array['uuid', 'uuid', 'uuid', 'integer'], 'answer scoring RPC exists');
select has_function('public', 'add_manual_score_atomic', array['uuid', 'uuid', 'integer', 'text'], 'manual scoring RPC exists');
select has_function('public', 'undo_latest_score_atomic', array['uuid'], 'undo scoring RPC exists');

insert into rooms (code, host_secret_hash, capacity) values ('SCORE2', 'hash', 2);
select * from join_room_atomic('SCORE2', 'One', 'duck', 'token-1');
select * from join_room_atomic('SCORE2', 'Two', 'bell', 'token-2');

select open_buzz_cycle_atomic((select id from rooms where code = 'SCORE2'));
select * from claim_buzz_atomic(
  (select active_buzz_cycle_id from rooms where code = 'SCORE2'),
  (select p.id from players p join rooms r on r.id = p.room_id where r.code = 'SCORE2' and p.display_name = 'One')
);

select lives_ok(
  $$select resolve_answer_score_atomic(
    (select id from rooms where code = 'SCORE2'),
    (select p.id from players p join rooms r on r.id = p.room_id where r.code = 'SCORE2' and p.display_name = 'One'),
    (select active_buzz_cycle_id from rooms where code = 'SCORE2'),
    1
  )$$,
  '+1 answer is recorded for buzz winner'
);

select is(
  (select sum(delta) from score_events se join rooms r on r.id = se.room_id where r.code = 'SCORE2'),
  1::bigint,
  'score total includes answer event'
);

select throws_ok(
  $$select resolve_answer_score_atomic(
    (select id from rooms where code = 'SCORE2'),
    (select p.id from players p join rooms r on r.id = p.room_id where r.code = 'SCORE2' and p.display_name = 'One'),
    (select active_buzz_cycle_id from rooms where code = 'SCORE2'),
    -1
  )$$,
  'P0001',
  'ERR_CYCLE_ALREADY_SCORED',
  'same active answer cannot be scored twice'
);

select lives_ok(
  $$select * from undo_latest_score_atomic((select id from rooms where code = 'SCORE2'))$$,
  'latest answer can be undone append-only'
);

select is(
  (select sum(delta) from score_events se join rooms r on r.id = se.room_id where r.code = 'SCORE2'),
  0::bigint,
  'undo restores total without deleting history'
);

select is(
  (select count(*) from score_events se join rooms r on r.id = se.room_id where r.code = 'SCORE2'),
  2::bigint,
  'undo keeps original and adds revert event'
);

select lives_ok(
  $$select resolve_answer_score_atomic(
    (select id from rooms where code = 'SCORE2'),
    (select p.id from players p join rooms r on r.id = p.room_id where r.code = 'SCORE2' and p.display_name = 'One'),
    (select active_buzz_cycle_id from rooms where code = 'SCORE2'),
    0
  )$$,
  'same cycle can be corrected after undo and zero is recorded'
);

select is(
  (select count(*) from score_events se join rooms r on r.id = se.room_id where r.code = 'SCORE2' and se.kind = 'answer'),
  2::bigint,
  'zero answer is a real answer event'
);

select lives_ok(
  $$select add_manual_score_atomic(
    (select id from rooms where code = 'SCORE2'),
    (select p.id from players p join rooms r on r.id = p.room_id where r.code = 'SCORE2' and p.display_name = 'Two'),
    -5,
    'Special round'
  )$$,
  'manual arbitrary negative adjustment is accepted'
);

select is(
  (select sum(delta) from score_events se join players p on p.id = se.player_id where p.display_name = 'Two'),
  -5::bigint,
  'negative player total is supported'
);

select is(
  (select reason from score_events se join players p on p.id = se.player_id where p.display_name = 'Two' and se.kind = 'manual'),
  'Special round',
  'manual reason is stored'
);

select throws_ok(
  $$select resolve_answer_score_atomic(
    (select id from rooms where code = 'SCORE2'),
    (select p.id from players p join rooms r on r.id = p.room_id where r.code = 'SCORE2' and p.display_name = 'One'),
    (select active_buzz_cycle_id from rooms where code = 'SCORE2'),
    2
  )$$,
  'P0001',
  'ERR_INVALID_ANSWER_DELTA',
  'normal answer only accepts -1, 0 or +1'
);

select is(
  (select count(*) from score_events se join rooms r on r.id = se.room_id where r.code = 'SCORE2' and se.reverted_event_id is not null),
  1::bigint,
  'revert provenance is retained'
);

select lives_ok(
  $$select * from undo_latest_score_atomic((select id from rooms where code = 'SCORE2'))$$,
  'latest manual score can also be undone'
);

select is(
  (select sum(delta) from score_events se join players p on p.id = se.player_id where p.display_name = 'Two'),
  0::bigint,
  'manual undo restores player total'
);

select * from finish();
rollback;
