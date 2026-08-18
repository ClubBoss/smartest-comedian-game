# Tournament Night V1

## Product goal

Run one home tournament for 8 joined players without replacing the existing realtime room, buzzer, scoring, question, recovery, or display engine.

Tournament Night V1 is one opinionated preset: `league_8_v1`.

## Format

1. Qualifier A: 4 players, top 2 advance.
2. Qualifier B: 4 players, top 2 advance.
3. Final: the four qualifiers start from a fresh stage score of 0.
4. Team question in the final can increase the champion prize from 10 AZN to 12 AZN without changing individual scores.
5. The final last question may use a special score delta such as +2.
6. The champion may keep the earned prize or choose a three-option Double or Nothing question. Correct doubles the prize; wrong burns it to 0.

Qualification is always top 2 from each qualifier, never top 4 scores across different question sets.

## Scoring isolation

Existing `score_events` remain the canonical append-only audit log. Tournament Night adds a nullable stage tag to new score events.

- Qualifier A events count only toward Qualifier A standings.
- Qualifier B events count only toward Qualifier B standings.
- Final events count only toward Final standings.
- Starting the Final therefore produces a stage score of 0 without deleting or rewriting qualifier history.
- Revert events inherit the stage of the event being undone.
- Score actions for a player who is not a member of the active tournament stage remain valid room recovery actions but do not contaminate tournament standings.

The existing room-level scoreboard remains backward compatible until Tournament UX explicitly switches its displayed total to the active stage projection.

## Qualifier resolution

Each qualifier has exactly four members and exactly two advancing players.

Automatic top-two selection is safe only when the score cutoff is unambiguous. If the second-place score is shared with an additional player, the host runs a tiebreak and explicitly selects the two advancing player IDs.

Examples:

- `5, 3, 2, 1` -> first two advance.
- `5, 5, 3, 1` -> first two advance; there is no cutoff tie.
- `5, 3, 3, 1` -> first place advances; the tied pair plays for the remaining slot.
- `4, 4, 4, 1` -> three players play for two slots.

The database transition deliberately accepts explicit advancing IDs instead of guessing through a tie.

## Question roles

Question pack items now have optional tournament metadata. A reusable question itself does not become permanently tied to a tournament role.

Supported roles:

- `regular`
- `qualifier_super`
- `team`
- `last`
- `double_or_nothing`
- `tiebreak`

Optional per-pack-item metadata includes:

- tournament stage
- correct points
- wrong points
- ordered hint-to-points schedule

This keeps content reusable: the same question can be regular in one pack and a special question in another.

## Qualifier Super rule

Default Pilot rule:

- no hint revealed -> +3
- 1 hint revealed -> +2
- 2 hints revealed -> +1
- 3 or more hints revealed -> 0
- wrong answer -> 0

A later implementation wave will add private locked player submissions so one player's spoken answer cannot leak to the other three.

## Host UX target

The host should not manually remember tournament rules.

The future controller should always show:

- current stage
- active four players
- active-stage standings
- question position and role
- next action
- automatic special scoring controls for the current role
- explicit tiebreak state when required
- top-two confirmation before stage transition

Existing manual recovery must remain available throughout.

## Player UX target

All eight players stay joined to one room.

- Active group phones expose the normal controller/buzzer.
- Inactive group phones show a passive `You are up next` state.
- Finalists become active for the Final without reconnecting.
- Eliminated players remain spectators.

## Display UX target

The shared display never shows spoiler titles. It may show only neutral context such as:

- `QUALIFIER A`
- `QUESTION 3 / 6`
- `SUPER QUESTION - UP TO 3 POINTS`
- `TEAM QUESTION - +2 AZN PRIZE`
- `LAST QUESTION - 2 POINTS`
- `DOUBLE OR NOTHING`

Internal labels remain host/question-bank metadata only.

## Photo questions

Tournament Night reuses the existing question asset model. No tournament-specific media system is required.

Use photos only when the image materially improves the guessing/comedy value. Recommended target is roughly 10-20% of a pack, not a quota.

Images remain editable content and can be uploaded manually through Question Bank. A question pack may therefore launch before optional photos are added.

## Wave plan

### Wave 1 - stage-safe foundation

- tournament night + stage membership persistence
- automatic stage tagging on existing score events
- stage score projection
- safe qualifier transition with explicit top-two IDs
- tournament metadata on question-pack items
- pure domain rules and tests for cutoff ties and +3/+2/+1 qualifier-super scoring

### Wave 2 - Host orchestration

- create Tournament Night from an 8-player room
- assign/shuffle groups 4+4
- active/inactive player gating
- active-stage standings
- top-two/tiebreak transition UX
- Final score projection starts at 0

### Wave 3 - special questions

- private locked answers for Qualifier Super
- Team Question prize mutation 10 -> 12
- Last Question scoring preset
- tiebreak controller

### Wave 4 - champion and Double or Nothing

- champion lock
- Take Money / Risk choice
- private A/B/C choice
- 10/12 -> 20/24 or 0
- final result display

### Wave 5 - Pilot content + photo polish

- import curated Pilot Tournament Pack 01 as data
- attach optional photo assets where they raise EV
- no spoiler labels on shared display

### Wave 6 - full home gauntlet

Simulate:

`8 join -> A -> tiebreak if needed -> top 2 -> B -> top 2 -> Final reset -> Team bonus -> Last -> champion -> take/risk -> payout`

Also cover refresh/reconnect, host recovery, undo, photo fallback, simultaneous buzz, and inactive-player gating.

## Non-goals

Tournament Night V1 does not create a generic tournament-builder platform. Do not add arbitrary brackets, arbitrary stage graphs, video questions, AI judging, player accounts, or configurable prize economies before real home-session evidence justifies them.
