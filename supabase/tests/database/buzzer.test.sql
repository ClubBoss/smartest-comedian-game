begin;

select plan(11);

select has_function('public', 'open_buzz_cycle_atomic', array['uuid'], 'open buzzer RPC exists');
select has_function('public', 'claim_buzz_atomic', array['uuid', 'uuid'], 'claim buzzer RPC exists');
select has_function('public', 'close_buzz_cycle_atomic', array['uuid'], 'close buzzer RPC exists');
select has_function('public', 'override_buzz_winner_atomic', array['uuid', 'uuid'], 'override RPC exists');

insert into rooms (code, host_secret_hash, capacity) values ('BUZZ10', 'hash', 10);
select * from join_room_atomic('BUZZ10', 'One', 'duck', 'token-1');
select * from join_room_atomic('BUZZ10', 'Two', 'bell', 'token-2');

select lives_ok(
  $$select open_buzz_cycle_atomic((select id from rooms where code = 'BUZZ10'))$$,
  'host can open buzzer with two players'
);

select is(
  (select phase from rooms where code = 'BUZZ10'),
  'BUZZ_OPEN',
  'room enters BUZZ_OPEN'
);

select lives_ok(
  $$select * from claim_buzz_atomic(
    (select active_buzz_cycle_id from rooms where code = 'BUZZ10'),
    (select p.id from players p join rooms r on r.id = p.room_id where r.code = 'BUZZ10' and p.display_name = 'One')
  )$$,
  'eligible player can claim buzzer'
);

select is(
  (select phase from rooms where code = 'BUZZ10'),
  'BUZZ_LOCKED',
  'winner locks the current cycle'
);

select lives_ok(
  $$select open_buzz_cycle_atomic((select id from rooms where code = 'BUZZ10'))$$,
  'host can open another cycle for same question'
);

select lives_ok(
  $$select * from claim_buzz_atomic(
    (select active_buzz_cycle_id from rooms where code = 'BUZZ10'),
    (select p.id from players p join rooms r on r.id = p.room_id where r.code = 'BUZZ10' and p.display_name = 'One')
  )$$,
  'same player is eligible again in next cycle'
);

select is(
  (select count(*) from buzz_attempts ba join players p on p.id = ba.player_id where p.display_name = 'One'),
  2::bigint,
  'same player has one attempt in each of two cycles'
);

select * from finish();
rollback;
