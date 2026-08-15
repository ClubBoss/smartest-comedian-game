begin;

select plan(40);

select has_function('public', 'queue_question_atomic', array['uuid','uuid'], 'queue question RPC exists');
select has_function('public', 'start_question_atomic', array['uuid','uuid','uuid'], 'start question RPC exists');
select has_function('public', 'reveal_question_stimulus_atomic', array['uuid'], 'stimulus reveal RPC exists');
select has_function('public', 'reveal_next_hint_atomic', array['uuid'], 'hint reveal RPC exists');
select has_function('public', 'reveal_question_answer_atomic', array['uuid'], 'answer reveal RPC exists');
select has_function('public', 'finish_question_atomic', array['uuid'], 'finish question RPC exists');

insert into rooms(code, host_secret_hash, capacity) values ('LIVEQ5', 'hash', 2);
select * from join_room_atomic('LIVEQ5', 'One', 'duck', 'token-1');
select * from join_room_atomic('LIVEQ5', 'Two', 'bell', 'token-2');

create temp table liveq_context(q1 uuid, q2 uuid, item1 uuid, item2 uuid);
insert into liveq_context(q1, q2) values (gen_random_uuid(), gen_random_uuid());

select save_question_atomic(
  (select q1 from liveq_context),
  'First queued question', 'First answer', '["one"]'::jsonb, 'First explanation', 'First private note',
  'general', 1, null, null, 'ready', '["First hint"]'::jsonb, '["queue"]'::jsonb, '[]'::jsonb
);
select save_question_atomic(
  (select q2 from liveq_context),
  'Snapshot prompt', 'Snapshot answer', '["snapshot variant"]'::jsonb, 'Snapshot explanation', 'Snapshot host note',
  'general', 2, null, null, 'ready', '["Hint one","Hint two"]'::jsonb, '["snapshot"]'::jsonb,
  '[{"asset_type":"image","storage_path":"snapshot/photo.png","mime_type":"image/png","alt_text":"Snapshot photo","caption":"Original caption"}]'::jsonb
);

select lives_ok($$update liveq_context set item1 = queue_question_atomic((select id from rooms where code='LIVEQ5'), q1)$$, 'first ready question can be queued');
select lives_ok($$update liveq_context set item2 = queue_question_atomic((select id from rooms where code='LIVEQ5'), q2)$$, 'second ready question can be queued');
select is(
  (select string_agg(q.question_id::text, '|' order by q.position) from room_question_queue q where q.room_id=(select id from rooms where code='LIVEQ5')),
  (select q1::text || '|' || q2::text from liveq_context),
  'queue preserves insertion order'
);
select lives_ok($$select move_queue_item_atomic((select id from rooms where code='LIVEQ5'), (select item2 from liveq_context), -1)$$, 'queue item can move up');
select is(
  (select string_agg(q.question_id::text, '|' order by q.position) from room_question_queue q where q.room_id=(select id from rooms where code='LIVEQ5') and q.state='queued'),
  (select q2::text || '|' || q1::text from liveq_context),
  'queue reordering is persisted'
);

select lives_ok($$select start_next_queued_question_atomic((select id from rooms where code='LIVEQ5'))$$, 'next queued question can preload privately');
select is(
  (select source_question_id from question_sessions where id=(select current_question_session_id from rooms where code='LIVEQ5')),
  (select q2 from liveq_context),
  'start-next uses first queued item after reorder'
);
select is(
  (select stimulus_revealed from question_sessions where id=(select current_question_session_id from rooms where code='LIVEQ5')),
  false,
  'preloaded stimulus starts hidden'
);
select throws_ok(
  $$select open_buzz_cycle_atomic((select id from rooms where code='LIVEQ5'))$$,
  'P0001','ERR_STIMULUS_HIDDEN','buzzer cannot open before question reveal'
);
select lives_ok($$select reveal_question_stimulus_atomic((select id from rooms where code='LIVEQ5'))$$, 'host can reveal learner stimulus');
select lives_ok($$select open_buzz_cycle_atomic((select id from rooms where code='LIVEQ5'))$$, 'buzzer can open after reveal');
select is(
  (select question_session_id from buzz_cycles where id=(select active_buzz_cycle_id from rooms where code='LIVEQ5')),
  (select current_question_session_id from rooms where code='LIVEQ5'),
  'buzz cycle is linked to current question snapshot'
);
select lives_ok($$select close_buzz_cycle_atomic((select id from rooms where code='LIVEQ5'))$$, 'host can close question buzz cycle');
select is((select phase from rooms where code='LIVEQ5'),'QUESTION','closing buzz returns to active question state');

select is(reveal_next_hint_atomic((select id from rooms where code='LIVEQ5')),1,'first hint reveals in order');
select is(reveal_next_hint_atomic((select id from rooms where code='LIVEQ5')),2,'second hint reveals in order');
select throws_ok(
  $$select reveal_next_hint_atomic((select id from rooms where code='LIVEQ5'))$$,
  'P0001','ERR_NO_MORE_HINTS','revealing beyond snapshot hint count is rejected'
);

select lives_ok($$
  select save_question_atomic(
    (select q2 from liveq_context),
    'Edited source prompt','Edited source answer','[]'::jsonb,'Edited explanation','Edited host note',
    'edited',4,null,null,'ready','["Edited hint"]'::jsonb,'["edited"]'::jsonb,
    '[{"asset_type":"image","storage_path":"snapshot/new.png","mime_type":"image/png","alt_text":"New photo"}]'::jsonb
  )
$$,'source Question Bank item can change after preload');
select is(
  (select prompt_snapshot from question_sessions where id=(select current_question_session_id from rooms where code='LIVEQ5')),
  'Snapshot prompt','live prompt remains immutable after source edit'
);
select is(
  (select answer_snapshot from question_sessions where id=(select current_question_session_id from rooms where code='LIVEQ5')),
  'Snapshot answer','live answer remains immutable after source edit'
);
select is(
  (select host_notes_snapshot from question_sessions where id=(select current_question_session_id from rooms where code='LIVEQ5')),
  'Snapshot host note','live host-only notes remain immutable after source edit'
);
select is(
  (select assets_snapshot->0->>'storage_path' from question_sessions where id=(select current_question_session_id from rooms where code='LIVEQ5')),
  'snapshot/photo.png','live media path remains immutable after source edit'
);

select lives_ok($$select reveal_question_answer_atomic((select id from rooms where code='LIVEQ5'))$$, 'host can reveal answer');
select is((select phase from rooms where code='LIVEQ5'),'REVEAL','answer reveal changes room phase to REVEAL');
select lives_ok($$select open_buzz_cycle_atomic((select id from rooms where code='LIVEQ5'))$$, 'host may still open another cycle after answer reveal');
select lives_ok($$select close_buzz_cycle_atomic((select id from rooms where code='LIVEQ5'))$$, 'host can close post-answer buzz cycle');
select is((select phase from rooms where code='LIVEQ5'),'REVEAL','closing post-answer buzz returns to REVEAL');

select lives_ok($$select finish_question_atomic((select id from rooms where code='LIVEQ5'))$$, 'host can finish live question');
select is((select state from room_question_queue where id=(select item2 from liveq_context)),'played','finished queued item becomes played');
select is((select current_question_session_id is null from rooms where code='LIVEQ5'),true,'finishing clears current question');
select is((select active_buzz_cycle_id is null from rooms where code='LIVEQ5'),true,'finishing clears active buzz cycle');
select is((select phase from rooms where code='LIVEQ5'),'READY','finishing returns room to READY');

select lives_ok($$select skip_queue_item_atomic((select id from rooms where code='LIVEQ5'),(select item1 from liveq_context))$$,'remaining queued question can be skipped');
select is((select state from room_question_queue where id=(select item1 from liveq_context)),'skipped','skipped queue state persists');

select * from finish();
rollback;
