# Three Independent Games — Pilot 01

## Status

`RUNTIME_DIRECTION = CANONICAL`

`QUESTION_ORDER_LOCK = COMPLETE`

`PRODUCTION_CONTENT_SYNC = VERIFIED`

`PRODUCTION_CONTENT_REVISION = difficulty_v2_4`

`EDITORIAL_STATUS = CLOSED_PASS`

`DIMINISHING_RETURNS_REACHED = YES`

`PRODUCTION_BUILD_SHA = 2102da4cd265dbb06aee7de871781a4f1162f279`

`PRODUCTION_TARGET_SHA256 = d2406def8f5bb415640686add0285689d8efdbb35fff682cd702625d122aa229`

Pilot 01 is production-ready as three independent ordinary games. Runtime mechanics remain on the verified production build, while the live Question Bank content is the separately verified V2.4 editorial revision.

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

## Canonical Pilot 01 V2.4 assignment

Package membership, production UUIDs, roles, and order are locked in `docs/PILOT_01_PACK_MANIFEST.json`. Exact accepted wording, answers, hints, host notes, sources and tags are recorded in `docs/PILOT_01_PRODUCTION_CONTENT.json`.

V2.4 preserves the 20 production UUID slots and the 6/6/8 pack shape. Several weak or structurally unsuitable earlier questions were explicitly replaced during the approved editorial difficulty/solvability revision; those superseded content identities are no longer production authority.

### Qualifier A — locked order

1. Elmer McCurdy — fake relatives
2. Spider fake gift
3. Groom of the Stool
4. Bowerbird forced perspective
5. Berners Street Hoax
6. **Qualifier Super:** Apollo insurance covers

### Qualifier B — locked order

1. Ancient Egyptian garlic test
2. English wife sale
3. Cardiff Giant
4. Flatworm self-insemination
5. Poison Squad
6. **Qualifier Super:** Carlos Kaiser red-card escape

### Final — locked order

1. Cuttlefish dual display
2. Cadaver Synod
3. **Team Question:** Great Stork Derby
4. Roland the Farter
5. Radithor lead coffin
6. Thérèse Humbert
7. **Last Question:** Poyais
8. Scottish mortsafe / body-snatchers

All score handling remains ordinary/manual. No current slot carries a wager, money/prize state, or Double-or-Nothing behavior.

## Content quality lock

V2.4 production cards satisfy the final Pilot 01 content contract:

- short, natural spoken setup
- prompt is independently solvable before hints; hints do not repair a missing premise
- correct cold answer is plausible but does not reflexively dominate the prompt
- enough space for multiple reasonable and funny wrong versions
- exactly three escalating hints
- H1 changes direction or removes broad guess families
- H2 makes the question realistically solvable for a good player
- H3 may become strong but does not simply state the requested answer
- answer is short enough to score by gist rather than trivia precision
- host notes define acceptable semantic variants
- strong absurd/comedic/paradoxical payoff
- source wording does not overclaim beyond the cited evidence
- no spoiler title on Player or Display surfaces
- photos only when an image materially raises question EV; no quota

Editorial desk QA reached diminishing returns after repeated adversarial passes covering instant-solve risk, impossible-cold prompts, hint leakage, dead air, answer overprecision, ambiguous scoring, factual/source framing and pack pacing. Further wording changes require blind-human or real-play evidence of a concrete failure mode.

No photo asset is mandatory for the V2.4 content closure. Image support remains available and high-EV images can be attached later without changing pack identity/order.

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

The production runtime build remains:

`2102da4cd265dbb06aee7de871781a4f1162f279`

V2.4 was then applied as an in-place Question Bank content revision through guarded same-repository GitHub Actions run `32200196955` on exact sync head `c14a2ff3bfa1be8a980d6bf0f2fd19b50925c962`, using the existing `QUESTION_BANK_ADMIN_KEY` secret without exposing it.

The workflow first composed the accepted V2.4 target from the closed editorial authority, validated exact UUID/order/tag invariants, and locked the target at SHA256:

`d2406def8f5bb415640686add0285689d8efdbb35fff682cd702625d122aa229`

Post-write strict read-back, followed by an independent closure read-back, proved:

- production health: `ok`
- production database: `ok`
- exact production build SHA: `2102da4cd265dbb06aee7de871781a4f1162f279`
- total Question Bank rows: 22
- pre-existing non-Pilot rows preserved: 2
- `pilot01` questions: 20
- `pilot01` questions in Ready status: 20
- canonical packs: exactly 3
- `Qualifier A`: 6 questions, exact locked UUID order
- `Qualifier B`: 6 questions, exact locked UUID order
- `Final`: 8 questions, exact locked UUID order
- forbidden Double-or-Nothing tags: 0
- superseded V2.2/V2.3 content keys remaining in production: 0

The runtime CI/E2E proves ordinary-room mechanics; guarded production read-back proves the exact live V2.4 card and pack inventory/order. No persistent show-night rooms were created by this content operation.

## Closure

Pilot 01 runtime, V2.4 editorial content, source gate, pack balance, production content sync and production read-back are closed.

Canonical production content authority:

- `docs/PILOT_01_PRODUCTION_CONTENT.json`
- `docs/PILOT_01_PACK_MANIFEST.json`
- `docs/PILOT_01_V2_4_PRODUCTION_CLOSURE.md`

Question wording is frozen until new evidence appears from blind-human testing or real play. Photos and reserve/tiebreak questions remain separate additive work and must not silently alter the locked 6/6/8 production pack order.