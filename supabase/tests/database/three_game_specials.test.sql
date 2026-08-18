begin;

select plan(15);

select has_column('public', 'room_question_queue', 'question_role', 'queued questions keep their game role');
select has_column('public', 'question_sessions', 'question_role_snapshot', 'live questions snapshot their game role');
select has_function('public', 'queue_question_pack_with_roles_atomic', array['uuid', 'uuid'], 'role-aware pack queue RPC exists');
select has_function('public', 'save_question_pack_with_roles_atomic', array['uuid', 'text', 'text', 'jsonb'], 'role-aware pack save RPC exists');

select is(
  (select count(*) from question_packs where id in (
    '90000000-0000-4000-8000-000000000001'::uuid,
    '90000000-0000-4000-8000-000000000002'::uuid,
    '90000000-0000-4000-8000-000000000003'::uuid
  )),
  3::bigint,
  'Pilot Night seeds exactly three game packs'
);

select is(
  (select count(*) from question_pack_items where pack_id = '90000000-0000-4000-8000-000000000001'::uuid),
  6::bigint,
  'Game 1 has five regular questions and one super question'
);

select is(
  (select count(*) from question_pack_items where pack_id = '90000000-0000-4000-8000-000000000002'::uuid),
  6::bigint,
  'Game 2 has five regular questions and one super question'
);

select is(
  (select count(*) from question_pack_items where pack_id = '90000000-0000-4000-8000-000000000003'::uuid),
  9::bigint,
  'Final pack contains regular, team, last, tiebreak and superfinal content'
);

select is(
  (
    select array_agg(question_role order by position)
    from question_pack_items
    where pack_id = '90000000-0000-4000-8000-000000000003'::uuid
  ),
  array['regular','regular','team','regular','regular','regular','last','tiebreak','double_or_nothing']::text[],
  'Final roles are stored in the intended running order'
);

insert into rooms (code, host_secret_hash, capacity) values ('PACKREPL', 'hash', 4);
select queue_question_atomic(
  (select id from rooms where code = 'PACKREPL'),
  '10000000-0000-4000-8000-000000000001'::uuid
);
select queue_question_pack_with_roles_atomic(
  (select id from rooms where code = 'PACKREPL'),
  '90000000-0000-4000-8000-000000000001'::uuid
);

select is(
  (select count(*) from room_question_queue where room_id = (select id from rooms where code = 'PACKREPL') and state = 'skipped'),
  1::bigint,
  'loading a game skips any older pending queue item'
);

select is(
  (select count(*) from room_question_queue where room_id = (select id from rooms where code = 'PACKREPL') and state = 'queued'),
  6::bigint,
  'loading a game leaves only that game pending'
);

insert into rooms (code, host_secret_hash, capacity) values ('PACKROLE', 'hash', 4);
select * from join_room_atomic('PACKROLE', 'P1', 'sound-p1', 'token-p1');
select * from join_room_atomic('PACKROLE', 'P2', 'sound-p2', 'token-p2');

select is(
  queue_question_pack_with_roles_atomic(
    (select id from rooms where code = 'PACKROLE'),
    '90000000-0000-4000-8000-000000000003'::uuid
  ),
  9,
  'loading the Final queues all nine saved items'
);

select is(
  (
    select question_role
    from room_question_queue
    where room_id = (select id from rooms where code = 'PACKROLE')
      and position = 2
  ),
  'team',
  'pack role is copied into the room queue'
);

select start_question_atomic(
  (select id from rooms where code = 'PACKROLE'),
  (select question_id from room_question_queue where room_id = (select id from rooms where code = 'PACKROLE') and position = 2),
  (select id from room_question_queue where room_id = (select id from rooms where code = 'PACKROLE') and position = 2)
);

select is(
  (
    select question_role_snapshot
    from question_sessions
    where id = (select current_question_session_id from rooms where code = 'PACKROLE')
  ),
  'team',
  'team role is preserved in the immutable live question snapshot'
);

select reveal_question_stimulus_atomic((select id from rooms where code = 'PACKROLE'));

select throws_ok(
  $$select open_buzz_cycle_atomic((select id from rooms where code = 'PACKROLE'))$$,
  'P0001',
  'ERR_QUESTION_ROLE_NO_BUZZ',
  'team question cannot accidentally open the normal buzzer'
);

select * from finish();
rollback;
