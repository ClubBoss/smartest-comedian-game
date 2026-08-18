# Three Independent Games — Pilot 01

## Status

`RUNTIME_DIRECTION = CANONICAL`

`CONTENT_LOCK = PARTIAL — FINAL TAIL RECOVERY REQUIRED`

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

## Canonical recovered assignment

Do not rewrite, replace, reshuffle, or fill unresolved slots by analogy. Exact question wording, hints, answer variants, correct-answer mapping and media are Question Bank data and must be recovered from the approved registry before import.

### Qualifier A — recovered order

1. Mary Smith — living alarm clock / knocker-up
2. Spider gift
3. Groom of the Stool
4. Mummy Brown
5. Berners Street Hoax
6. **Qualifier Super:** Apollo insurance covers

### Qualifier B — recovered order

1. Garlic
2. Wife sale
3. Cardiff Giant
4. NASA toilet
5. Poison Squad
6. **Qualifier Super:** Princess Caraboo

### Final — safely recovered prefix and role anchor

The interrupted canonical assignment pass safely recovers this sequence:

1. Cuttlefish disguise / «Каракатица с двумя образами»
2. Corpse trial / Cadaver Synod / «Суд над трупом папы»
3. **Team Question:** Hanoi rat tails / «Ханойские крысы»
4. Roland-the-Farter / «Роланд-Пердун»
5. Radioactive Radithor

The remaining Final tail, exact remaining order, and any Last/final-super role assignment are **not safely recovered yet**. They are intentionally left unresolved here rather than invented.

## Content quality lock

For recovered/approved questions, preserve the prior content contract:

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

Pilot 01 content is complete only when all of the following are true:

1. exact Final tail is recovered from the approved registry/assignment pass — no invention;
2. exact wording/hints/answers for every assigned question are verified;
3. production Question Bank is checked and missing questions are imported;
4. exactly three ordered saved packs exist: `Qualifier A`, `Qualifier B`, `Final`;
5. approved high-EV photo assets are attached where applicable;
6. QA runs each pack in a separate fresh game and confirms score isolation, exact order, hints/photos, buzzer cycles, scoring and host recovery.

Until then, `CONTENT_LOCK` remains partial even though the runtime direction is final.
