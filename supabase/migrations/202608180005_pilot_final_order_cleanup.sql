-- Keep the normal Final path simple: Last Question -> Superfinal.
-- The tiebreak remains in the same pack as a reserve item and can be manually preloaded only when needed.
select public.save_question_pack_with_roles_atomic(
  '90000000-0000-4000-8000-000000000003'::uuid,
  'Финал · Pilot Night 01',
  'Финальная четвёрка начинает с нуля. Внутри: основные вопросы, командный, последний +2, суперфинал A/B/C и резервный тай-брейк.',
  '[
    {"questionId":"30000000-0000-4000-8000-000000000001","role":"regular"},
    {"questionId":"30000000-0000-4000-8000-000000000002","role":"regular"},
    {"questionId":"30000000-0000-4000-8000-000000000003","role":"team"},
    {"questionId":"30000000-0000-4000-8000-000000000004","role":"regular"},
    {"questionId":"30000000-0000-4000-8000-000000000005","role":"regular"},
    {"questionId":"30000000-0000-4000-8000-000000000006","role":"regular"},
    {"questionId":"30000000-0000-4000-8000-000000000007","role":"last"},
    {"questionId":"30000000-0000-4000-8000-000000000009","role":"double_or_nothing"},
    {"questionId":"30000000-0000-4000-8000-000000000008","role":"tiebreak"}
  ]'::jsonb
);

update public.questions
set host_notes = 'СУПЕРФИНАЛ A/B/C ТОЛЬКО ДЛЯ ПОБЕДИТЕЛЯ. Buzzer не использовать. Дополнительные условия ведущий проговаривает сам.',
    updated_at = now()
where id = '30000000-0000-4000-8000-000000000009'::uuid;
