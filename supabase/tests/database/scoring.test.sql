begin;

select plan(22);

select has_function('public', 'resolve_answer_score_atomic', array['uuid', 'uuid', 'uuid', 'integer'], 'answer score RPC exists');
select has_function('public', 'add_manual_score_atomic', array['uuid', 'uuid', 'integer', 'text'], 'manual score RPC exists');
select has_function('public', 'undo_latest_score_atomic', array['uuid'], 'undo score RPC exists');
select has_column('public', 'score_events', 'event_seq', 'score events have deterministic causal ordering');

insert into rooms (code, host_secret_hash, capacity) values ('SCORE2', 'hash', 2);
select * from join_room_atomic('SCORE2', 'One', 'duck', 'token-1');
select * from join_room_atomic('SCORE2', 'Two', 'bell', 'token-2');
select open_buzz_cycle_atomic((select id from rooms where code = 'SCORE2'));

create temp table score_test_context(old_cycle uuid);
insert into score_test_context select active_buzz_cycle_id from rooms where code = 'SCORE2';

select * from claim_buzz_atomic(
  (select old_cycle from score_test_context),
  (select p.id from players p join rooms r on r.id = p.room_id where r.code = 'SCORE2' and p.display_name = 'One')
);

select lives_ok($$select resolve_answer_score_atomic((select id from rooms where code = 'SCORE2'), (select p.id from players p join rooms r on r.id = p.room_id where r.code = 'SCORE2' and p.display_name = 'One'), (select old_cycle from score_test_context), 1)$$, '+1 answer can be scored');
select is((select sum(delta) from score_events se join rooms r on r.id = se.room_id where r.code = 'SCORE2'), 1::bigint, 'answer changes total by +1');
select throws_ok($$select resolve_answer_score_atomic((select id from rooms where code = 'SCORE2'), (select p.id from players p join rooms r on r.id = p.room_id where r.code = 'SCORE2' and p.display_name = 'One'), (select old_cycle from score_test_context), 1)$$, 'P0001', 'ERR_CYCLE_ALREADY_SCORED', 'same cycle cannot have two active answer scores');
select lives_ok($$select * from undo_latest_score_atomic((select id from rooms where code = 'SCORE2'))$$, 'latest answer can be undone append-only');
select is((select sum(delta) from score_events se join rooms r on r.id = se.room_id where r.code = 'SCORE2'), 0::bigint, 'undo compensates total without deleting history');
select is((select count(*) from score_events se join rooms r on r.id = se.room_id where r.code = 'SCORE2'), 2::bigint, 'undo leaves original and compensation events');
select lives_ok($$select resolve_answer_score_atomic((select id from rooms where code = 'SCORE2'), (select p.id from players p join rooms r on r.id = p.room_id where r.code = 'SCORE2' and p.display_name = 'One'), (select old_cycle from score_test_context), 0)$$, 'same cycle can be rescored after undo and zero is allowed');
select is((select count(*) from score_events se join rooms r on r.id = se.room_id where r.code = 'SCORE2' and se.delta = 0), 1::bigint, 'zero answer is persisted as an event');
select lives_ok($$select open_buzz_cycle_atomic((select id from rooms where code = 'SCORE2'))$$, 'host can advance to a fresh buzz cycle');
select throws_ok($$select resolve_answer_score_atomic((select id from rooms where code = 'SCORE2'), (select p.id from players p join rooms r on r.id = p.room_id where r.code = 'SCORE2' and p.display_name = 'One'), (select old_cycle from score_test_context), -1)$$, 'P0001', 'ERR_STALE_CYCLE', 'ordinary scoring cannot target an old buzz cycle');

select * from claim_buzz_atomic(
  (select active_buzz_cycle_id from rooms where code = 'SCORE2'),
  (select p.id from players p join rooms r on r.id = p.room_id where r.code = 'SCORE2' and p.display_name = 'One')
);
select lives_ok($$select resolve_answer_score_atomic((select id from rooms where code = 'SCORE2'), (select p.id from players p join rooms r on r.id = p.room_id where r.code = 'SCORE2' and p.display_name = 'One'), (select active_buzz_cycle_id from rooms where code = 'SCORE2'), 2)$$, 'confirmed answer score accepts +2 in one event');
select is((select sum(delta) from score_events se join players p on p.id = se.player_id join rooms r on r.id = se.room_id where r.code = 'SCORE2' and p.display_name = 'One'), 2::bigint, 'multi-point answer affects winner total atomically');
select lives_ok($$select * from undo_latest_score_atomic((select id from rooms where code = 'SCORE2'))$$, 'multi-point answer can be undone as one score event');

select lives_ok($$select add_manual_score_atomic((select id from rooms where code = 'SCORE2'), (select p.id from players p join rooms r on r.id = p.room_id where r.code = 'SCORE2' and p.display_name = 'Two'), 7, 'special question')$$, 'manual arbitrary integer adjustment works');
select is((select sum(delta) from score_events se join players p on p.id = se.player_id join rooms r on r.id = se.room_id where r.code = 'SCORE2' and p.display_name = 'Two'), 7::bigint, 'manual score affects selected player');
select lives_ok($$select * from undo_latest_score_atomic((select id from rooms where code = 'SCORE2'))$$, 'manual adjustment can be undone');
select is((select sum(delta) from score_events se join players p on p.id = se.player_id join rooms r on r.id = se.room_id where r.code = 'SCORE2' and p.display_name = 'Two'), 0::bigint, 'undo restores manual-adjusted player total');
select is((select count(*) from score_events where kind = 'revert'), 3::bigint, 'three undo events preserve append-only audit history');

select * from finish();
rollback;
