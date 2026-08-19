# Pilot 01 V2.4 — Editorial Closure / Diminishing Returns Gate

Status: `EDITORIAL_CLOSED_PREDEPLOY`

Production mutation: `NO`

This is the final desk/source/adversarial closure gate for the Pilot 01 V2.4 question set. It follows the V2.3 self-contained-solvability repair and the V2.4 adversarial pre-deploy pass.

## Final closure question

Is there any remaining desk-identifiable defect whose expected show-quality gain from another rewrite is larger than the risk of degrading natural wording, reintroducing prompt dependency, creating a reflex answer, or destabilizing pack balance?

Final answer: `NO`.

Further editorial changes now require new evidence from blind humans or real play.

## Effective content authority

Do not infer the final candidate from one intermediate patch in isolation.

The single composition authority is:

`docs/PILOT_01_V2_4_EFFECTIVE_COMPOSITION.json`

It defines:
- exact 20 production UUIDs;
- final content keys;
- exact pack shape 6/6/8;
- exact order;
- low-to-high override precedence;
- superseded content keys;
- production sync invariants.

This closes the only material operational issue found during this final cycle: V2.4 was previously correct editorially but distributed across base + multiple override files, creating avoidable sync ambiguity.

## Final 20/20 closure matrix

| Slot | Effective card | Cold-solvable | Non-reflex | Version space | Hints narrow, not repair | H2 useful | H3 no literal requested answer | Gist scoreable | Source framing | Closure |
|---|---|---|---|---|---|---|---|---|---|---|
| A1 | Elmer McCurdy | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | CLOSED |
| A2 | Spider fake gift | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | CLOSED |
| A3 | Groom of the Stool | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | CLOSED |
| A4 | Bowerbird perspective | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | CLOSED |
| A5 | Berners Street wager | PASS | RELIEF | PASS | PASS | PASS | PASS | PASS | PASS | CLOSED |
| A6 | Apollo insurance covers | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | CLOSED |
| B1 | Garlic test | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | CLOSED |
| B2 | Wife sale | PASS | RELIEF | PASS | PASS | PASS | PASS | PASS | PASS | CLOSED |
| B3 | Cardiff Giant | PASS | RELIEF | PASS | PASS | PASS | PASS | PASS | PASS | CLOSED |
| B4 | Flatworm self-insemination | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | CLOSED |
| B5 | Poison Squad | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | CLOSED |
| B6 | Carlos Kaiser | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS* | CLOSED |
| F1 | Cuttlefish dual display | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS* | CLOSED |
| F2 | Cadaver Synod | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | CLOSED |
| F3 | Great Stork Derby | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | CLOSED |
| F4 | Roland | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | CLOSED |
| F5 | Radithor | PASS | RELIEF | PASS | PASS | PASS | PASS | PASS | PASS | CLOSED |
| F6 | Thérèse Humbert | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | CLOSED |
| F7 | Poyais | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | CLOSED |
| F8 | Mortsafe | PASS | PASS | PASS | PASS | PASS | PASS | PASS | PASS | CLOSED |

`PASS*`: claim is intentionally framed as reported evidence / plausible explanation where the source does not warrant stronger causal certainty.

## Final external fact recheck

The last cycle rechecked the most vulnerable claims against independent sources:

- `Macrostomum hystrix`: peer-reviewed evidence supports hypodermic self-insemination by a needle-like stylet in isolated worms, with sperm found in anterior/head tissues and interpreted as migrating toward self-fertilization.
- mourning cuttlefish: peer-reviewed evidence supports simultaneous male courtship coloration toward a female and female-like coloration toward a single rival; explanatory wording about why one-rival geometry is safer remains explicitly non-universal.
- Carlos Kaiser: reputable long-form reporting records the Bangu episode in which he started a confrontation with opposing supporters and was sent off before entering the pitch; wording remains `reported history`, not court-record certainty.
- mortsafe: National Museums Scotland states that relatives used locked iron mortsafes for the first six weeks after burial because body snatching for anatomy schools was rife.
- Apollo insurance covers: independent accounts and astronaut provenance support signed/postmarked covers being left with families as a limited financial substitute for adequate life insurance.
- Thérèse Humbert: modern academic work supports the fictitious inheritance, contested wills/heirs, court sequestration and borrowing against the supposedly locked fortune.
- ancient Egyptian garlic test: modern historical reporting based on the Kahun material describes vaginal garlic followed by checking for garlic smell on the breath.
- wife sale, Cardiff Giant and Poyais were also rechecked against independent historical/legal reporting; current gist framing remains defensible.

No source recheck produced a material content correction.

## Pack pacing closure

Qualifier A: `medium → medium → medium → medium → relief → medium-hard`.

Qualifier B: `medium → relief → relief → medium-hard → medium → medium-hard/super`.

Final: `medium-hard → medium → hard → medium-hard/comic → relief → hard → hard → hard`.

### B2 + B3 consecutive relief review

Wife Sale and Cardiff Giant are the only consecutive relief pair. Swapping order or desk-hardening one could make the difficulty curve more uniform, but the expected gain is now below the change threshold because:

- their reasoning modes and comic payoffs are different;
- B4 immediately changes texture and raises difficulty;
- there is no empirical evidence that either currently produces repeated read-before-finish solves;
- changing a healthy card solely to smooth an estimated curve recreates the earlier over-editing risk.

Verdict: `KEEP ORDER UNTIL HUMAN EVIDENCE`.

## Quantified closure gates

- `PROMPT_DEPENDENCY_CRITICAL = 0`
- `REFLEX_CRITICAL = 0`
- `TRIVIA_LOCK_CRITICAL = 0`
- `HINT_MISSING_PREMISE = 0`
- `HINT_LITERAL_REQUESTED_ANSWER = 0`
- `H2_DEAD_AIR_CRITICAL = 0`
- `ANSWER_OVERPRECISION_CRITICAL = 0`
- `AMBIGUOUS_SCORING_CRITICAL = 0`
- `SOURCE_OVERCLAIM_CRITICAL = 0`
- `PACK_BALANCE_CRITICAL = 0`
- `COMPOSITION_AMBIGUITY = 0` after creation of the V2.4 effective composition authority
- `PASS/CLOSED = 20/20`

## Diminishing-returns proof

The last several waves exposed both directions of failure:

1. prompts that were too obvious;
2. prompts made so hard that hints supplied missing premises;
3. repaired prompts that then became reflexive;
4. overly specific answers that required trivia rather than reasoning.

V2.4 now sits inside the intended playable region on all four axes. A further desk-only rewrite would be driven by estimated micro-differences rather than a demonstrated defect.

Therefore:

`EXPECTED_VALUE_OF_NEXT_DESK_REWRITE < RISK_OF_REGRESSION`

`FURTHER_DESK_EDITORIAL = STOP`

## What can still create new evidence

Only these should reopen question wording/difficulty:

- a blind player answers before the host finishes the prompt repeatedly;
- no plausible player can form a useful hypothesis until H2/H3;
- H1/H2 creates immediate convergence in actual play;
- the host cannot consistently score semantically correct variants;
- a source challenge materially changes the factual premise;
- real play shows pack pacing is too fast or too slow.

Absent one of those signals, wording is frozen.

## Final decision

`V2_4_EDITORIAL = CLOSED_PASS`

`V2_4_SOURCE_GATE = CLOSED_PASS`

`V2_4_PACK_BALANCE = CLOSED_PASS`

`V2_4_COMPOSITION_AUTHORITY = CLOSED_PASS`

`DIMINISHING_RETURNS_REACHED = YES`

`READY_FOR_GUARDED_PRODUCTION_SYNC = YES`

`PRODUCTION_SYNC = NOT_EXECUTED`
