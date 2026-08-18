begin;

select plan(5);

insert into rooms (code, host_secret_hash, capacity) values ('TBUZZ8', 'hash', 8);
select * from join_room_atomic('TBUZZ8', 'A1', 'sound-a1', 'token-a1');
select * from join_room_atomic('TBUZZ8', 'A2', 'sound-a2', 'token-a2');
select * from join_room_atomic('TBUZZ8', 'A3', 'sound-a3', 'token-a3');
select * from join_room_atomic('TBUZZ8', 'A4', 'sound-a4', 'token-a4');
select * from join_room_atomic('TBUZZ8', 'B1', 'sound-b1', 'token-b1');
select * from join_room_atomic('TBUZZ8', 'B2', 'sound-b2', 'token-b2');
select * from join_room_atomic('TBUZZ8', 'B3', 'sound-b3', 'token-b3');
select * from join_room_atomic('TBUZZ8', 'B4', 'sound-b4', 'token-b4');

create temp table tournament_context(tournament_id uuid);
insert into tournament_context
select create_league_8_tournament_atomic(
  (select id from rooms where code = 'TBUZZ8'),
  array(select id from players where room_id = (select id from rooms where code = 'TBUZZ8') and display_name like 'A%' order by seat_order),
  array(select id from players where room_id = (select id from rooms where code = 'TBUZZ8') and display_name like 'B%' order by seat_order)
);

select lives_ok(
  $$select open_buzz_cycle_atomic((select id from rooms where code = 'TBUZZ8'))$$,
  'host can open a buzzer cycle for qualifier A'
);

select throws_ok(
  $$select * from claim_buzz_atomic(
    (select active_buzz_cycle_id from rooms where code = 'TBUZZ8'),
    (select id from players where display_name = 'B1' and room_id = (select id from rooms where code = 'TBUZZ8'))
  )$$,
  'P0001',
  'ERR_TOURNAMENT_PLAYER_INACTIVE',
  'qualifier B player cannot buzz during qualifier A'
);

select lives_ok(
  $$select * from claim_buzz_atomic(
    (select active_buzz_cycle_id from rooms where code = 'TBUZZ8'),
    (select id from players where display_name = 'A1' and room_id = (select id from rooms where code = 'TBUZZ8'))
  )$$,
  'qualifier A player can buzz during qualifier A'
);

select is(
  (select winner_player_id from buzz_cycles where id = (select active_buzz_cycle_id from rooms where code = 'TBUZZ8')),
  (select id from players where display_name = 'A1' and room_id = (select id from rooms where code = 'TBUZZ8')),
  'active qualifier player becomes winner'
);

select is(
  (select count(*) from buzz_attempts ba join players p on p.id = ba.player_id where p.display_name = 'B1'),
  0::bigint,
  'inactive qualifier attempt is not recorded'
);

select * from finish();
rollback;
