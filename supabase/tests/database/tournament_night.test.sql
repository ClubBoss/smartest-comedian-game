begin;

select plan(15);

select has_table('public', 'tournament_nights', 'tournament nights table exists');
select has_table('public', 'tournament_stage_members', 'tournament stage membership table exists');
select has_column('public', 'score_events', 'tournament_stage', 'score events can be scoped to a tournament stage');
select has_function('public', 'create_league_8_tournament_atomic', array['uuid', 'uuid[]', 'uuid[]'], 'league creation RPC exists');
select has_function('public', 'complete_league_qualifier_atomic', array['uuid', 'text', 'uuid[]'], 'qualifier completion RPC exists');

insert into rooms (code, host_secret_hash, capacity) values ('LEAGUE8', 'hash', 8);
select * from join_room_atomic('LEAGUE8', 'A1', 'sound-a1', 'token-a1');
select * from join_room_atomic('LEAGUE8', 'A2', 'sound-a2', 'token-a2');
select * from join_room_atomic('LEAGUE8', 'A3', 'sound-a3', 'token-a3');
select * from join_room_atomic('LEAGUE8', 'A4', 'sound-a4', 'token-a4');
select * from join_room_atomic('LEAGUE8', 'B1', 'sound-b1', 'token-b1');
select * from join_room_atomic('LEAGUE8', 'B2', 'sound-b2', 'token-b2');
select * from join_room_atomic('LEAGUE8', 'B3', 'sound-b3', 'token-b3');
select * from join_room_atomic('LEAGUE8', 'B4', 'sound-b4', 'token-b4');

create temp table tournament_context(tournament_id uuid);
insert into tournament_context
select create_league_8_tournament_atomic(
  (select id from rooms where code = 'LEAGUE8'),
  array(select id from players where room_id = (select id from rooms where code = 'LEAGUE8') and display_name like 'A%' order by seat_order),
  array(select id from players where room_id = (select id from rooms where code = 'LEAGUE8') and display_name like 'B%' order by seat_order)
);

select is(
  (select current_stage from tournament_nights where id = (select tournament_id from tournament_context)),
  'qualifier_a',
  'league starts in qualifier A'
);

select add_manual_score_atomic(
  (select id from rooms where code = 'LEAGUE8'),
  (select id from players where display_name = 'A1' and room_id = (select id from rooms where code = 'LEAGUE8')),
  3,
  'qualifier super'
);
select is(
  (select tournament_stage from score_events where reason = 'qualifier super'),
  'qualifier_a',
  'active qualifier member score is tagged with qualifier A'
);

select add_manual_score_atomic(
  (select id from rooms where code = 'LEAGUE8'),
  (select id from players where display_name = 'B1' and room_id = (select id from rooms where code = 'LEAGUE8')),
  7,
  'inactive group safety adjustment'
);
select is(
  (select tournament_stage from score_events where reason = 'inactive group safety adjustment'),
  null,
  'inactive group score does not contaminate the active tournament stage'
);

select is(
  complete_league_qualifier_atomic(
    (select tournament_id from tournament_context),
    'qualifier_a',
    array(
      (select id from players where display_name = 'A1' and room_id = (select id from rooms where code = 'LEAGUE8')),
      (select id from players where display_name = 'A2' and room_id = (select id from rooms where code = 'LEAGUE8'))
    )
  ),
  'qualifier_b',
  'completing qualifier A advances to qualifier B'
);

select add_manual_score_atomic(
  (select id from rooms where code = 'LEAGUE8'),
  (select id from players where display_name = 'B1' and room_id = (select id from rooms where code = 'LEAGUE8')),
  2,
  'qualifier B score'
);
select is(
  (select tournament_stage from score_events where reason = 'qualifier B score'),
  'qualifier_b',
  'qualifier B score is tagged independently'
);

select * from undo_latest_score_atomic((select id from rooms where code = 'LEAGUE8'));
select is(
  (select tournament_stage from score_events where kind = 'revert' order by created_at desc, id desc limit 1),
  'qualifier_b',
  'undo inherits the stage of the event it reverts'
);

select add_manual_score_atomic(
  (select id from rooms where code = 'LEAGUE8'),
  (select id from players where display_name = 'B1' and room_id = (select id from rooms where code = 'LEAGUE8')),
  2,
  'qualifier B replacement'
);

select is(
  complete_league_qualifier_atomic(
    (select tournament_id from tournament_context),
    'qualifier_b',
    array(
      (select id from players where display_name = 'B1' and room_id = (select id from rooms where code = 'LEAGUE8')),
      (select id from players where display_name = 'B2' and room_id = (select id from rooms where code = 'LEAGUE8'))
    )
  ),
  'final',
  'completing qualifier B advances to the final'
);

select is(
  (select count(*) from tournament_stage_members where tournament_id = (select tournament_id from tournament_context) and stage = 'final'),
  4::bigint,
  'final contains exactly two qualifiers from each group'
);

select add_manual_score_atomic(
  (select id from rooms where code = 'LEAGUE8'),
  (select id from players where display_name = 'A1' and room_id = (select id from rooms where code = 'LEAGUE8')),
  1,
  'final score'
);
select is(
  (select score from tournament_stage_scores where tournament_id = (select tournament_id from tournament_context) and stage = 'final' and player_id = (select id from players where display_name = 'A1' and room_id = (select id from rooms where code = 'LEAGUE8'))),
  1,
  'final score starts fresh instead of carrying qualifier points'
);

select is(
  (select score from tournament_stage_scores where tournament_id = (select tournament_id from tournament_context) and stage = 'qualifier_a' and player_id = (select id from players where display_name = 'A1' and room_id = (select id from rooms where code = 'LEAGUE8'))),
  3,
  'qualifier history remains intact after the final starts'
);

select * from finish();
rollback;
