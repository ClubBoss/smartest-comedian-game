begin;

select plan(14);

select has_column('public', 'tournament_nights', 'qualifier_a_pack_id', 'tournament stores qualifier A pack');
select has_column('public', 'room_question_queue', 'question_role', 'queue snapshots question role');
select has_column('public', 'question_sessions', 'question_role_snapshot', 'live session snapshots question role');
select has_table('public', 'special_answer_submissions', 'special answer submissions table exists');

insert into rooms (code, host_secret_hash, capacity) values ('PACKV1', 'hash', 8);
select * from join_room_atomic('PACKV1', 'A1', 'sound-a1', 'token-a1');
select * from join_room_atomic('PACKV1', 'A2', 'sound-a2', 'token-a2');
select * from join_room_atomic('PACKV1', 'A3', 'sound-a3', 'token-a3');
select * from join_room_atomic('PACKV1', 'A4', 'sound-a4', 'token-a4');
select * from join_room_atomic('PACKV1', 'B1', 'sound-b1', 'token-b1');
select * from join_room_atomic('PACKV1', 'B2', 'sound-b2', 'token-b2');
select * from join_room_atomic('PACKV1', 'B3', 'sound-b3', 'token-b3');
select * from join_room_atomic('PACKV1', 'B4', 'sound-b4', 'token-b4');

insert into questions(id, prompt, answer, status) values
('10000000-0000-0000-0000-000000000001', 'A regular', 'A', 'ready'),
('10000000-0000-0000-0000-000000000002', 'A super', 'AS', 'ready'),
('10000000-0000-0000-0000-000000000003', 'B regular', 'B', 'ready'),
('10000000-0000-0000-0000-000000000004', 'Final regular', 'F', 'ready'),
('10000000-0000-0000-0000-000000000005', 'Final team', 'T', 'ready'),
('10000000-0000-0000-0000-000000000006', 'Final last', 'L', 'ready'),
('10000000-0000-0000-0000-000000000007', 'Final double', 'D', 'ready');

insert into question_packs(id, name) values
('20000000-0000-0000-0000-000000000001', 'Qualifier A'),
('20000000-0000-0000-0000-000000000002', 'Qualifier B'),
('20000000-0000-0000-0000-000000000003', 'Final Four');

insert into question_pack_items(pack_id, question_id, position, tournament_stage, question_role, correct_points, wrong_points, hint_point_schedule) values
('20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000001',0,'qualifier_a','regular',1,-1,'[]'),
('20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000002',1,'qualifier_a','qualifier_super',null,0,'[3,2,1,0]'),
('20000000-0000-0000-0000-000000000002','10000000-0000-0000-0000-000000000003',0,'qualifier_b','regular',1,-1,'[]'),
('20000000-0000-0000-0000-000000000003','10000000-0000-0000-0000-000000000004',0,'final','regular',1,-1,'[]'),
('20000000-0000-0000-0000-000000000003','10000000-0000-0000-0000-000000000005',1,'final','team',null,0,'[]'),
('20000000-0000-0000-0000-000000000003','10000000-0000-0000-0000-000000000006',2,'final','last',2,-1,'[]'),
('20000000-0000-0000-0000-000000000003','10000000-0000-0000-0000-000000000007',3,'final','double_or_nothing',null,0,'[]');

create temp table runtime_context(tournament_id uuid);
insert into runtime_context
select create_league_8_tournament_atomic(
  (select id from rooms where code='PACKV1'),
  array(select id from players where room_id=(select id from rooms where code='PACKV1') and display_name like 'A%' order by seat_order),
  array(select id from players where room_id=(select id from rooms where code='PACKV1') and display_name like 'B%' order by seat_order)
);

select lives_ok(
  format('select set_tournament_packs_atomic(%L::uuid,%L::uuid,%L::uuid,%L::uuid)',
    (select tournament_id from runtime_context),
    '20000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000002',
    '20000000-0000-0000-0000-000000000003'),
  'three packs can be assigned once'
);

select is(
  queue_tournament_stage_pack_atomic((select tournament_id from runtime_context), 'qualifier_a'),
  2,
  'qualifier A queues exactly its two questions'
);

select is(
  (select question_role from room_question_queue where room_id=(select id from rooms where code='PACKV1') and position=1),
  'qualifier_super',
  'qualifier super role survives into room queue'
);

select is(
  (select hint_point_schedule from room_question_queue where room_id=(select id from rooms where code='PACKV1') and position=1),
  '[3, 2, 1, 0]'::jsonb,
  'qualifier super keeps 3-2-1-0 schedule'
);

select start_next_queued_question_atomic((select id from rooms where code='PACKV1'));
select is(
  (select question_role_snapshot from question_sessions where id=(select current_question_session_id from rooms where code='PACKV1')),
  'regular',
  'live question snapshots role immutably'
);
select * from reveal_question_stimulus_atomic((select id from rooms where code='PACKV1'));
select * from finish_question_atomic((select id from rooms where code='PACKV1'));
select start_next_queued_question_atomic((select id from rooms where code='PACKV1'));
select * from reveal_question_stimulus_atomic((select id from rooms where code='PACKV1'));

select throws_ok(
  format('select open_buzz_cycle_atomic(%L::uuid)', (select id from rooms where code='PACKV1')),
  'P0001', 'ERR_QUESTION_ROLE_NO_BUZZ',
  'qualifier super cannot accidentally open normal buzzer'
);

select lives_ok(
  format('select submit_special_answer_atomic(%L::uuid,%L::uuid,%L)',
    (select current_question_session_id from rooms where code='PACKV1'),
    (select id from players where room_id=(select id from rooms where code='PACKV1') and display_name='A1'),
    'my locked answer'),
  'active qualifier player can lock a private super answer'
);

select throws_ok(
  format('select submit_special_answer_atomic(%L::uuid,%L::uuid,%L)',
    (select current_question_session_id from rooms where code='PACKV1'),
    (select id from players where room_id=(select id from rooms where code='PACKV1') and display_name='A1'),
    'second answer'),
  'P0001', 'ERR_SPECIAL_ANSWER_ALREADY_LOCKED',
  'super answer is immutable after lock'
);

select * from finish_question_atomic((select id from rooms where code='PACKV1'));
select complete_league_qualifier_atomic(
  (select tournament_id from runtime_context), 'qualifier_a',
  array[(select id from players where display_name='A1' and room_id=(select id from rooms where code='PACKV1')),
        (select id from players where display_name='A2' and room_id=(select id from rooms where code='PACKV1'))]
);
select is(queue_tournament_stage_pack_atomic((select tournament_id from runtime_context),'qualifier_b'),1,'qualifier B pack queues after stage transition');
select * from skip_queue_item_atomic((select id from rooms where code='PACKV1'),(select id from room_question_queue where room_id=(select id from rooms where code='PACKV1') and tournament_stage='qualifier_b'));
select complete_league_qualifier_atomic(
  (select tournament_id from runtime_context), 'qualifier_b',
  array[(select id from players where display_name='B1' and room_id=(select id from rooms where code='PACKV1')),
        (select id from players where display_name='B2' and room_id=(select id from rooms where code='PACKV1'))]
);
select is(queue_tournament_stage_pack_atomic((select tournament_id from runtime_context),'final'),4,'Final Four pack queues after second qualifier');
select is(set_tournament_team_bonus_atomic((select tournament_id from runtime_context),true),12,'team question increases prize from 10 to 12');
select is(complete_tournament_atomic((select tournament_id from runtime_context),(select id from players where display_name='A1' and room_id=(select id from rooms where code='PACKV1'))),12,'champion locks guaranteed prize');
select is(resolve_double_or_nothing_atomic((select tournament_id from runtime_context),true,true),24,'correct risk doubles 12 to 24');

select * from finish();
rollback;
