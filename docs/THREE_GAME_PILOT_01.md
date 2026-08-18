# Three Independent Games — Pilot 01

## Status

`RUNTIME_DIRECTION = CANONICAL`

`QUESTION_ORDER_LOCK = COMPLETE`

`PRODUCTION_CONTENT_SYNC = VERIFIED`

`PRODUCTION_BUILD_SHA = 2102da4cd265dbb06aee7de871781a4f1162f279`

Pilot 01 is production-ready as three independent ordinary games. The merged runtime, production Question Bank, and ordered saved packs were independently verified on 2026-08-18.

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

Package membership and order are locked. Exact production question IDs are recorded in `docs/PILOT_01_PACK_MANIFEST.json`.

Where exact earlier approved wording survived, it was preserved. Where it did not survive the interrupted earlier content pass, the same locked question identity was completed with a source-backed final editorial pass under the same quality contract; no question identity was substituted and no slot was reshuffled.

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

The eighth question was originally assigned to the old Double-or-Nothing slot. Pilot 01 preserves the question and its final A/B/C position but does **not** preserve the wager/economy: there is no money, prize doubling, prize loss, or Double-or-Nothing state. Score handling is ordinary/manual.

## Content quality lock

Production cards preserve the Pilot 01 content contract:

- short natural spoken setup
- non-leading question
- short, unambiguous answer
- three escalating hints whose first hint does not give the answer away
- strong absurd/comedic/paradoxical payoff
- enough answer-space for funny guesses
- no spoiler title on Player or Display surfaces
- source label and URL on the production card
- photos only when an image materially raises the question's EV; no quota

No photo asset was designated mandatory for Pilot 01 closure. Image support remains available and individual high-EV images can be attached later without changing pack identity/order.

## Implementation truth

Available and reused:

- ordinary rooms with 2–10 players
- fresh room scoring
- buzzer cycles and repeated attempts
- manual +1 / 0 / -1 style scoring and recovery controls
- Question Bank
- ordered hints and answer variants
- photo/image questions
- bulk text import
- reusable ordered Question Packs

The previously merged Tournament Night database/API work is legacy implementation and remains dormant. The active Host surface does not offer Tournament Night as the Pilot 01 show-night path.

## Verification record

Runtime PR #39 was validated after GitHub Actions quota was restored:

- lint: PASS
- typecheck: PASS
- unit tests: PASS
- production build: PASS
- Cloudflare worker build/dry-run: PASS
- Playwright E2E: PASS
- three-independent-game score isolation regression: PASS

Production was then read through a guarded same-repository GitHub Actions audit using the existing `QUESTION_BANK_ADMIN_KEY` secret without exposing the secret. Initial production truth was two non-Pilot test questions and zero packs.

A guarded one-time sync imported the 20 canonical Pilot 01 cards and created the three fixed-order packs. Post-write read-back verification proved:

- production health: `ok`
- production database: `ok`
- exact production build SHA: `2102da4cd265dbb06aee7de871781a4f1162f279`
- total Question Bank rows: 22
- pre-existing non-Pilot rows preserved: 2
- `pilot01` questions: 20
- `pilot01` questions in Ready status: 20
- canonical packs: exactly 3
- `Qualifier A`: 6 questions, exact locked order
- `Qualifier B`: 6 questions, exact locked order
- `Final`: 8 questions, exact locked order
- forbidden Double-or-Nothing tags: 0

The local/CI E2E proves the ordinary-room scoring, isolation, host surface, and runtime mechanics; the guarded production read-back proves the exact live card and pack inventory/order. Together they satisfy the Pilot 01 machine QA gate without creating persistent show-night rooms in production.

## Closure

Pilot 01 three-game runtime and production content sync are closed.

Future question wording or image improvements remain ordinary Question Bank editorial work and must not silently change the locked Pilot 01 pack identity/order unless a new explicit content revision is approved.
