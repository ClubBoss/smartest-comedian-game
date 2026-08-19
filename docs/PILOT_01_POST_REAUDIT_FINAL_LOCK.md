# Pilot 01 — Post-Reaudit Final Lock

## Status

`AI_EDITORIAL = FROZEN_PENDING_HUMAN_EVIDENCE`

`CONTENT_CONCEPTS = CLOSED`

`REPLACEMENTS_NEEDED = 0`

`NEXT_GATE = BLIND_HUMAN_TEST`

This note reconciles the final post-patch review round of `docs/PILOT_01_FINAL_HUMAN_TEST_CANDIDATE.md`.

## Final editorial decision

Four post-patch reviewers converged on the candidate being ready for human playtest. One deliberately strict reviewer still flagged A2/A3/A4/A5/F8 as possible cold-difficulty / climax risks, but the other reviews did not reproduce those as material failures. Those slots are therefore **not reopened by AI**; their difficulty is now an empirical human-test question.

One remaining concrete issue was reproduced after the patch: **F7 Mary Toft Hint 2 still stated the core inference too directly**.

### Authoritative F7 Hint 2 override

Replace the current F7 Hint 2:

> Хирург понял, что этот кролик успел нормально питаться.

with:

> Ключевой след не был врождённым: что-то успело попасть внутрь тела животного извне.

F7 Hint 1, Hint 3, Question, Answer and Scoring remain unchanged.

## Human-test watchlist — observation only, no pre-emptive edits

- `A2` — check whether multiple ordinary testers reflex-solve from the prompt before useful wrong hypotheses appear.
- `A3` — check whether private access is an instant default answer for multiple testers; this is intentionally allowed to be a lighter Qualifier card unless repeated evidence says otherwise.
- `A4` — check whether the prompt is solved immediately by forced-perspective recognition; do not penalize legitimate geometric deduction by itself.
- `A5` — check whether the bet target is reflex-obvious to multiple testers before the setup generates guesses.
- `F8` — check both solve stage and whether it feels sufficiently climactic as the Last Question. Reordering is allowed only if live pacing evidence supports it.

## Reopen rule

No further AI-only wording changes are authorized. Reopen a slot only if blind human evidence shows a repeatable material failure:

- repeated reflex solve before the setup lands;
- no useful hypothesis by Hint 2;
- a hint functions as the answer;
- host cannot score reasonable semantic variants consistently;
- a factual/source challenge changes the premise;
- actual show pacing reveals a repeated difficulty cluster.

Otherwise the effective human-test candidate is the existing master file plus the single F7 Hint 2 override above.