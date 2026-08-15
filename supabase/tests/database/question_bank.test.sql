begin;

select plan(19);

select has_function('public', 'save_question_atomic', array['uuid','text','text','jsonb','text','text','text','integer','text','text','text','jsonb','jsonb','jsonb'], 'question save RPC exists');
select isnt(has_table_privilege('anon', 'public.questions', 'SELECT'), true, 'anon cannot read Question Bank');
select isnt(has_table_privilege('authenticated', 'public.questions', 'SELECT'), true, 'authenticated clients cannot read answers directly');
select is((select count(*) from storage.buckets where id = 'question-images' and public = false), 1::bigint, 'private question image bucket exists');

create temp table q_context(id uuid);
insert into q_context values (gen_random_uuid());
select lives_ok($$select save_question_atomic((select id from q_context),'Why is this funny?','Because of the mismatch','["mismatch","incongruity"]'::jsonb,'Explanation','Host note','Comedy',2,'Source','https://example.com','ready','["Think about expectations","Think about contrast"]'::jsonb,'["humor","format","humor"]'::jsonb,'[]'::jsonb)$$,'text question saves atomically');
select is((select status from questions where id=(select id from q_context)),'ready','text question can be ready');
select is((select count(*) from question_hints where question_id=(select id from q_context)),2::bigint,'hints are persisted');
select is((select string_agg(text,'|' order by position) from question_hints where question_id=(select id from q_context)),'Think about expectations|Think about contrast','hint order is preserved');
select is((select count(*) from question_tags where question_id=(select id from q_context)),2::bigint,'tags are deduplicated');

create temp table image_q(id uuid);
insert into image_q values (gen_random_uuid());
select lives_ok($$select save_question_atomic((select id from image_q),null,'Photo answer','["variant"]'::jsonb,null,'Private photo note','Photo',3,null,null,'ready','["Look closer"]'::jsonb,'["photo"]'::jsonb,'[{"asset_type":"image","storage_path":"q/one.png","mime_type":"image/png","alt_text":"One"},{"asset_type":"image","storage_path":"q/two.webp","mime_type":"image/webp","alt_text":"Two"}]'::jsonb)$$,'image-led question can be saved without text prompt');
select is((select count(*) from question_assets where question_id=(select id from image_q)),2::bigint,'multiple ordered images are stored');
select lives_ok($$select save_question_atomic((select id from image_q),null,'Photo answer','["variant"]'::jsonb,null,'Private photo note','Photo',3,null,null,'ready','["Look closer"]'::jsonb,'["photo"]'::jsonb,'[{"asset_type":"image","storage_path":"q/two.webp","mime_type":"image/webp","alt_text":"Two"},{"asset_type":"image","storage_path":"q/one.png","mime_type":"image/png","alt_text":"One"}]'::jsonb)$$,'image order can be replaced atomically');
select is((select storage_path from question_assets where question_id=(select id from image_q) order by position limit 1),'q/two.webp','new image order is persisted');

insert into rooms(code,host_secret_hash,capacity) values ('SNAPQ','hash',2);
insert into question_sessions(room_id,source_question_id,prompt_snapshot,answer_snapshot,host_notes_snapshot,assets_snapshot)
select r.id,q.id,q.prompt,q.answer,q.host_notes,'[]'::jsonb from rooms r cross join questions q where r.code='SNAPQ' and q.id=(select id from q_context);
select lives_ok($$select save_question_atomic((select id from q_context),'Changed prompt','Changed answer','[]'::jsonb,null,'Changed private note','Comedy',2,null,null,'draft','[]'::jsonb,'["changed"]'::jsonb,'[]'::jsonb)$$,'source question can be edited after snapshot');
select is((select answer_snapshot from question_sessions limit 1),'Because of the mismatch','source edits do not mutate answer snapshot');
select is((select host_notes_snapshot from question_sessions limit 1),'Host note','source edits do not mutate private-note snapshot');
select throws_ok($$select save_question_atomic(gen_random_uuid(),null,'Answer','[]'::jsonb,null,null,null,null,null,null,'draft','[]'::jsonb,'[]'::jsonb,'[]'::jsonb)$$,'P0001','ERR_STIMULUS_REQUIRED','question requires text or image stimulus');
select throws_ok($$select save_question_atomic(gen_random_uuid(),'Q','Answer','[]'::jsonb,null,null,null,null,null,null,'draft','[]'::jsonb,'[]'::jsonb,'[{"asset_type":"image","storage_path":"x","mime_type":"text/plain"}]'::jsonb)$$,'P0001','ERR_INVALID_ASSET','invalid image metadata is rejected');
select save_question_atomic((select id from q_context),'Changed prompt','Changed answer','[]'::jsonb,null,null,'Comedy',2,null,null,'archived','[]'::jsonb,'["changed"]'::jsonb,'[]'::jsonb);
select is((select status from questions where id=(select id from q_context)),'archived','question can be archived without deletion');

select * from finish();
rollback;
