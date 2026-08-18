# Pilot 01 V2.3 — Self-Contained Solvability Audit

Status: `REVIEW_ONLY_NOT_DEPLOYED`
Base: production V2.2 currently live; V2.2 is not accepted as final content after this audit.

## Acceptance contract

A good card must satisfy all of the following:

1. **Prompt-solvable:** the correct answer must already be a plausible hypothesis from facts in the prompt. A hint may narrow the field, but must not introduce the one critical fact without which the answer is impossible.
2. **Not reflex-obvious:** prompt alone should normally leave at least 4 plausible wrong directions.
3. **Hint 1 = direction:** reduces the search space without naming the missing mechanism.
4. **Hint 2 = strong narrowing:** a good player should often be able to solve here.
5. **Hint 3 = near-solve, not answer:** should make the answer highly accessible without literally stating it.
6. **Answer granularity:** host can score the gist; exact niche names/details should not be required unless they are inferable.
7. **No trivia-lock:** a card should not be 'know the anecdote or wait for the answer to appear in a hint'.

Scoring: 5 = strong, 1 = broken for this dimension.

| Slot | Card | Prompt solvability | Wrong-version space | Hint independence | Leak control | Answer granularity | Verdict |
|---|---|---:|---:|---:|---:|---:|---|
| A1 | Elmer McCurdy | 4 | 5 | 4 | 2 | 4 | POLISH HINTS |
| A2 | Spider gift | 3 | 5 | 3 | 2 | 3 | REWRITE |
| A3 | Groom of the Stool | 3 | 5 | 4 | 2 | 4 | POLISH HINTS |
| A4 | Bowerbird perspective | 1 | 4 | 1 | 1 | 3 | REWRITE STRUCTURE |
| A5 | Berners Street | 1 | 5 | 1 | 1 | 4 | REWRITE ANGLE |
| A6 | Apollo covers | 4 | 4 | 4 | 4 | 4 | PASS |
| B1 | Garlic test | 4 | 5 | 4 | 4 | 4 | PASS |
| B2 | Wife sale | 4 | 4 | 4 | 2 | 4 | POLISH H3 |
| B3 | Cardiff Giant | 4 | 4 | 4 | 1 | 4 | POLISH HINTS |
| B4 | Flatworm fencing | 1 | 5 | 1 | 1 | 3 | REWRITE STRUCTURE |
| B5 | Poison Squad | 2 | 5 | 2 | 2 | 4 | REWRITE PROMPT |
| B6 | Princess Caraboo | 1 | 5 | 1 | 1 | 2 | REWRITE ANGLE |
| F1 | Cuttlefish | 1 | 4 | 1 | 1 | 3 | REWRITE STRUCTURE |
| F2 | Cadaver Synod | 3 | 5 | 4 | 3 | 4 | PASS |
| F3 | Great Stork Derby | 1 | 5 | 1 | 1 | 3 | REWRITE STRUCTURE |
| F4 | Roland | 1 | 5 | 1 | 2 | 2 | REWRITE STRUCTURE |
| F5 | Radithor | 1 | 4 | 1 | 1 | 3 | REWRITE STRUCTURE |
| F6 | Thérèse Humbert | 3 | 4 | 2 | 1 | 2 | REWRITE + BROADEN ANSWER |
| F7 | Poyais | 4 | 4 | 4 | 2 | 4 | POLISH HINTS |
| F8 | Brinkley goat glands | 1 | 5 | 1 | 2 | 2 | REPLACE |

## Why the user's examples are real defects

### F5 Radithor
V2.2 prompt only says 'expensive medicinal tonic' and 'the coffin needed protection'. Nothing in that prompt privileges radiation or lead over sealing, theft protection, chemicals, infection, preservation, concrete, zinc, etc. The key fact — that the tonic contained radium — appears only in Hint 3, which also effectively gives the whole answer. This is trivia-lock, not deduction.

### F4 Roland
V2.2 asks for three arbitrary physical actions with no constraints. There is no logical route from 'strange annual payment at court' to 'jump + whistle + fart'. Hint 2 then inserts two of the three answer components. The prompt is therefore not a puzzle; it is an unknown historical fact waiting to be disclosed.

### B6 Princess Caraboo
V2.2 asks 'who exposed her?' but the prompt contains no evidence that favors a former landlady over a sailor, linguist, diplomat, policeman, relative, servant, journalist, former employer, or dozens of other people. Hint 2 then adds the decisive missing biography. This must be re-angled to something inferable: why publicity itself destroyed the scam.

## V2.3 design decisions

- Preserve the 6/6/8 pack shape and all production UUIDs.
- Preserve underlying story/topic in 19 slots.
- Replace only F8 Brinkley, because the exact animal/tissue answer remains trivia-locked unless choices or decisive facts are inserted; those choices create a speed/random-guess problem.
- New F8 candidate: Operation Mincemeat 'pocket litter' — a corpse with fake secret papers also carried love letters, receipts, tickets and other mundane items. The question asks why the mundane items mattered. The answer is inferable from the prompt: they made the fictitious officer's identity believable, increasing trust in the secret papers.
- Do not deploy V2.3 until a separate acceptance pass returns all 20 cards as self-contained and balanced.

## Summary

- Literal PASS unchanged: 3 / 20
- Hint-only polish: 5 / 20
- Structural rewrite: 11 / 20
- Replace: 1 / 20
- Production mutation in this wave: **NONE**
- Merge of V2.2 closure PR #44: **BLOCKED / DRAFT**
