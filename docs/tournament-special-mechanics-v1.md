# Tournament Night V1 — Special Mechanics

This document is implementation authority for the bounded `league_8_v1` special-question wave. It does not introduce a generic tournament builder.

## Question roles

- `regular`: existing buzzer flow and normal host scoring.
- `qualifier_super`: all four active qualifier players lock one private text answer; no buzzer. Correct score is `3 - revealed_hint_count`, clamped to `0`; wrong is `0`.
- `team`: Final Four discuss one shared answer. Host resolves correct/wrong. Correct changes the prize from 10 AZN to 12 AZN; no individual score.
- `last`: existing buzzer flow with recommended score presets `+2 / 0 / -1`.
- `double_or_nothing`: champion only, after tournament champion is fixed. The champion chooses TAKE or RISK. RISK exposes one A/B/C answer submission. Correct doubles 10/12 to 20/24 AZN; wrong sets payout to 0.
- `tiebreak`: existing buzzer flow for sudden-death resolution. It does not alter historical qualifier/final scores unless the host explicitly records a score.

## Host-authoritative rules

Special mechanics are server-enforced. Client hiding/disabled controls are convenience only.

1. Pack-item tournament metadata must survive `pack -> room queue -> question session` as immutable snapshots.
2. A staged pack item cannot be played in a different active tournament stage.
3. `qualifier_super`, `team`, and `double_or_nothing` cannot open a buzzer cycle.
4. Qualifier Super submissions are private until the host reveals them. A player can lock exactly one answer per question.
5. Qualifier Super scoring uses the hint count at the time that player's answer was locked.
6. Team Question changes prize state only; it never changes individual scores.
7. Final champion cannot be fixed while first place is tied; host must run a tiebreak first.
8. TAKE is final. RISK is final once chosen; the winner cannot return to TAKE after seeing the A/B/C question.
9. Double-or-Nothing can only be answered by the fixed champion.
10. All score changes remain append-only through existing score events.

## Prize state

Base prize is 10 AZN. Team Question correct adds 2 AZN.

Tournament payout status is one of:

- `unresolved`: champion not yet paid / no decision.
- `taken`: champion banked current prize.
- `risking`: champion chose Double or Nothing.
- `won`: Double or Nothing correct; payout is doubled current prize.
- `lost`: Double or Nothing wrong; payout is 0.

## UX requirement

The host must not manually select the current question mode. The current question's immutable role snapshot drives the available controls automatically.
