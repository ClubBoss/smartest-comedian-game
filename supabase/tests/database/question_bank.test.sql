begin;

select plan(13);

select has_function(
  'public',
  'save_question_atomic',
  array['uuid','text','text','jsonb','text','text','text','smallint','text','text','text','jsonb','jsonb','jsonb'],
  'atomic question save RPC exists'
);

select ok(
  exists(select 1 from storage.buckets where id = 'question-images' and public = false),
  'question image bucket is private'
);

create temp table qb_context(text_id uuid, image_id uuid);
insert into qb_context values (gen_random_uuid(), gen_random_uuid());

select lives_ok($$
  select save_question_atomic(
    (select text_id from qb_context),
    'Why does the sky look blue?',
    'Rayleigh scattering',
    '["scattering", "Rayleigh"]'::jsonb,
    'Short wavelengths scatter more strongly.',
    'Let people reason before revealing.',
    'science',
    2,
    'Reference',
    'https://example.test/source',
    'ready',
    '["Think about wavelength", "Think about scattering"]'::jsonb,
    '["science", "physics", "science"]'::jsonb,
    '[]'::jsonb
  )
$$, 'text-only question can be saved');

select is(
  (select prompt from questions where id = (select text_id from qb_context)),
  'Why does the sky look blue?',
  'question prompt persists'
);

select is(
  (select count(*) from question_hints where question_id = (select text_id from qb_context)),
  2::bigint,
  'ordered hints persist'
);

select is(
  (select string_agg(text, '|' order by position) from question_hints where question_id = (select text_id from qb_context)),
  'Think about wavelength|Think about scattering',
  'hint order is preserved'
);

select is(
  (select count(*) from question_tags where question_id = (select text_id from qb_context)),
  2::bigint,
  'duplicate tags are normalized to unique rows'
);

select lives_ok($$
  select save_question_atomic(
    (select image_id from qb_context),
    null,
    'The second object',
    '[]'::jsonb,
    null,
    null,
    'visual',
    3,
    null,
    null,
    'draft',
    '[]'::jsonb,
    '["photo"]'::jsonb,
    '[
      {"asset_type":"image","storage_path":"q/first.jpg","mime_type":"image/jpeg","alt_text":"first"},
      {"asset_type":"image","storage_path":"q/second.png","mime_type":"image/png","caption":"second"}
    ]'::jsonb
  )
$$, 'image-led question can be saved without text prompt');

select is(
  (select string_agg(storage_path, '|' order by position) from question_assets where question_id = (select image_id from qb_context)),
  'q/first.jpg|q/second.png',
  'multiple image order is preserved'
);

select throws_ok($$
  select save_question_atomic(
    gen_random_uuid(), null, 'Answer', '[]'::jsonb, null, null, null, null,
    null, null, 'draft', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb
  )
$$, 'P0001', 'ERR_STIMULUS_REQUIRED', 'question requires text or image stimulus');

insert into rooms(code, host_secret_hash, capacity) values ('SNAPQ4', 'hash', 2);
insert into question_sessions(
  room_id, source_question_id, prompt_snapshot, answer_snapshot,
  answer_variants_snapshot, explanation_snapshot, host_notes_snapshot,
  hints_snapshot, assets_snapshot
)
select
  r.id,
  q.id,
  q.prompt,
  q.answer,
  q.answer_variants,
  q.explanation,
  q.host_notes,
  (select jsonb_agg(h.text order by h.position) from question_hints h where h.question_id = q.id),
  '[]'::jsonb
from rooms r
join questions q on q.id = (select text_id from qb_context)
where r.code = 'SNAPQ4';

select lives_ok($$
  select save_question_atomic(
    (select text_id from qb_context),
    'Edited source prompt',
    'Edited source answer',
    '[]'::jsonb,
    null,
    null,
    'science',
    4,
    null,
    null,
    'archived',
    '["Edited hint"]'::jsonb,
    '["edited"]'::jsonb,
    '[]'::jsonb
  )
$$, 'existing question can be edited and archived');

select is(
  (select status from questions where id = (select text_id from qb_context)),
  'archived',
  'archive status persists'
);

select is(
  (select prompt_snapshot from question_sessions where source_question_id = (select text_id from qb_context)),
  'Why does the sky look blue?',
  'editing source question does not mutate historical live snapshot'
);

select is(
  (select answer_snapshot from question_sessions where source_question_id = (select text_id from qb_context)),
  'Rayleigh scattering',
  'historical answer snapshot also remains immutable'
);

select * from finish();
rollback;
