# Pilot 01 V2.2 — Production Content Closure

## State

- `STATUS = PRODUCTION_VERIFIED`
- Difficulty/content desk QA: `20/20 PASS`
- Production sync run: `32197603203`
- Exact ops head: `3008bf2917217761ac83b47c7753cae0491dfe59`
- Production runtime SHA: `2102da4cd265dbb06aee7de871781a4f1162f279`
- Production database: `ok`
- Production verified at: `2026-08-18T23:32:50Z`

## Verified production read-back

The guarded V2.2 sync updated the existing 20 Pilot 01 question UUIDs in place and then re-read the live Question Bank and canonical packs.

Verified:

- total Question Bank rows: `22`
- preserved non-Pilot rows: `2`
- Pilot 01 rows: `20`
- Pilot 01 Ready rows: `20/20`
- canonical Question Packs: exactly `3`
- Qualifier A: `6` questions, original UUID order preserved
- Qualifier B: `6` questions, original UUID order preserved
- Final: `8` questions, original UUID order preserved
- forbidden Double-or-Nothing tags: `0`
- every production prompt, answer, answer variant list, hint list, explanation, host note, category, difficulty, source and tag set matched the V2.2 target after write
- existing question assets were preserved by the in-place update path

## Accepted content changes

Five underlying slots were replaced because the prior facts were too recognizable or self-solving:

1. Mary Smith / knocker-up -> Elmer McCurdy
2. Mummy Brown -> great bowerbird forced perspective
3. NASA toilet -> flatworm penis fencing
4. Hanoi rat tails -> Great Stork Derby
5. Heroin final A/B/C -> John Brinkley goat-gland procedure with delayed choices

The remaining slots preserve their underlying story and were re-angled only where needed to prevent reflex solves while keeping the questions simple and hintable.

## Canonical artifacts

- `docs/PILOT_01_PRODUCTION_CONTENT.json` — exact V2.2 payload that was production-verified. Its `status` field records that the blob originated as the production target; this closure records that the target was subsequently verified exact in production.
- `docs/PILOT_01_PACK_MANIFEST.json` — V2.2 production UUID/order manifest.

## Runtime direction

Pilot 01 remains three independent ordinary games:

1. Qualifier A — fresh room/game, four players, fresh score.
2. Qualifier B — fresh room/game, four players, fresh score.
3. Final — fresh room/game, four finalists, fresh score.

No automatic tournament advancement, prize/money state, cross-game scoring or Double-or-Nothing is admitted.

## Next content work

Difficulty rewriting is frozen unless real human play reveals a concrete failure mode. Remaining high-EV work is operational/content polish: reserve/tiebreak questions, selective images where they improve the game without leaking the answer, and a short real-device rehearsal.
