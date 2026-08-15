begin;

select plan(11);

select has_function(
  'public',
  'join_room_atomic',
  array['text', 'text', 'text', 'text'],
  'atomic room join function exists'
);

select ok(
  has_table_privilege('service_role', 'public.rooms', 'SELECT'),
  'service role can read rooms'
);

select ok(
  has_table_privilege('service_role', 'public.rooms', 'INSERT'),
  'service role can create rooms'
);

select ok(
  has_table_privilege('service_role', 'public.players', 'UPDATE'),
  'service role can update players'
);

insert into rooms (code, host_secret_hash, capacity) values ('JOIN2', 'hash', 2);

select lives_ok(
  $$select * from join_room_atomic('JOIN2', 'One', 'duck', 'token-1')$$,
  'first player joins'
);

select lives_ok(
  $$select * from join_room_atomic('JOIN2', 'Two', 'bell', 'token-2')$$,
  'second player joins'
);

select is(
  (select count(*) from players p join rooms r on r.id = p.room_id where r.code = 'JOIN2' and p.removed_at is null),
  2::bigint,
  'room contains exactly two active players'
);

select throws_ok(
  $$select * from join_room_atomic('JOIN2', 'Three', 'gong', 'token-3')$$,
  'P0001',
  'ERR_ROOM_FULL',
  'third player cannot exceed capacity'
);

insert into rooms (code, host_secret_hash, capacity) values ('SOUND3', 'hash', 3);
select * from join_room_atomic('SOUND3', 'One', 'duck', 'token-a');

select throws_ok(
  $$select * from join_room_atomic('SOUND3', 'Two', 'duck', 'token-b')$$,
  'P0001',
  'ERR_SOUND_TAKEN',
  'active built-in sound cannot be duplicated'
);

select lives_ok(
  $$select * from join_room_atomic('SOUND3', 'Two', 'bell', 'token-b')$$,
  'different built-in sound can join'
);

select is(
  (select count(*) from storage.buckets where id = 'buzzer-sounds'),
  1::bigint,
  'private custom-sound bucket exists'
);

select * from finish();
rollback;
