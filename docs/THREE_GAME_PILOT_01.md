# Three Independent Games — Pilot 01

## Status

`RUNTIME_DIRECTION = CANONICAL`

`QUESTION_ORDER_LOCK = COMPLETE`

`PRODUCTION_CONTENT_SYNC = UNVERIFIED`

This document supersedes Tournament Night V1 as the product/run-of-show authority for Pilot 01. It does **not** claim that the listed questions already exist in the production Question Bank or that the three saved production packs have already been created.

## Runtime contract

The evening is exactly three ordinary, independent games:

1. **Qualifier A** — a fresh room/game with a fresh score.
2. **Qualifier B** — a separate fresh room/game with a fresh score.
3. **Final** — a separate fresh room/game with the four finalists and a fresh score.

The host determines advancement manually outside the app and starts each game manually. Scores are never carried between these games.

### Explicit non-goals

- no Tournament Night controller
- no tournament standings
- no automatic top-two/top-four advancement
- no automatic Qualifier A -> Qualifier B -> Final orchestration
- no prize or money state
- no Double-or-Nothing wager/economy

The normal Room + Question Bank + ordered Question Pack + buzzer/scoring/recovery flow is the runtime foundation.

## Canonical Pilot 01 assignment

The package membership and order below are locked. Do not rewrite, replace or reshuffle these questions while implementing the packs. Exact approved question wording, hints, answer variants, correct-answer mapping and media remain Question Bank data and must be verified against the approved registry before production sync.

### Qualifier A — locked order

1. Mary Smith — living alarm clock / knocker-up
2. Spider gift
3. Groom of the Stool
4. Mummy Brown
5. Berners Street Hoax
6. **Qualifier Super:** Apollo insurance covers

### Qualifier B — locked order

1. Garlic
2. Wife sale
3. Cardiff Giant
4. NASA toilet
5. Poison Squad
6. **Qualifier Super:** Princess Caraboo

### Final — locked order

1. Cuttlefish disguise / «Каракатица с двумя образами»
2. Corpse trial / Cadaver Synod / «Суд над трупом папы»
3. **Team Question:** Hanoi rat tails / «Ханойские крысы»
4. Roland-the-Farter / «Роланд-Пердун»
5. Radioactive Radithor
6. Thérèse Humbert — fake inheritance
7. **Last Question:** Poyais
8. **Final A/B/C:** heroin question

The eighth question was originally assigned to the old Double-or-Nothing slot. Pilot 01 preserves the approved question and its final A/B/C position, but **does not preserve the wager/economy**: there is no money, prize doubling, prize loss or Double-or-Nothing state. Any score handling is performed through the ordinary/manual game controls.

## Content quality lock

For approved questions, preserve the prior content contract:

- short natural spoken setup
- non-leading question
- short, unambiguous answer
- escalating hints whose first hint does not give the answer away
- strong absurd/comedic/paradoxical payoff
- enough answer-space for funny guesses
- no spoiler title on Player or Display surfaces
- photos only when the image materially raises the question's EV; no quota

## Implementation truth

Already available and to be reused:

- ordinary rooms with 2–10 players
- fresh room scoring
- buzzer cycles and repeated attempts
- manual +1 / 0 / -1 style scoring and recovery controls
- Question Bank
- ordered hints and answer variants
- photo/image questions
- bulk text import
- reusable ordered Question Packs

The previously merged Tournament Night database/API work is legacy implementation. It should remain dormant until a separate migration audit determines whether destructive removal is safe. The active Host surface must not offer Tournament Night as the show-night path.

## Closure gate

The **question-order assignment is closed**. Production content delivery is complete only when all of the following are independently verified:

1. exact approved wording/hints/answers for every assigned question are present in the production Question Bank;
2. exactly three ordered saved packs exist: `Qualifier A`, `Qualifier B`, `Final`;
3. approved high-EV photo assets are attached where applicable;
4. QA runs each pack in a separate fresh game and confirms score isolation, exact order, hints/photos, buzzer cycles, scoring and host recovery.

Until production data is directly inspected, `PRODUCTION_CONTENT_SYNC` remains unverified rather than assumed.
