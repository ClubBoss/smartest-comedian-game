# Task Breakdown and Execution Order

## Workstream A - Product/Governance
Owner: ChatGPT manager/orchestrator.

A1. Maintain Product Contract and scope gates. [DONE initial]
A2. Review implementation reports against V1 acceptance scenario.
A3. Admit only changes with clear in-room EV or reliability value.
A4. Log post-V1 ideas instead of expanding active scope.

## Workstream B - Foundation
Owner: implementation agent.

B1. Scaffold Next.js + TypeScript app.
B2. Add strict lint/typecheck/test scripts.
B3. Add environment validation.
B4. Add CI workflow.
B5. Create route shells: `/`, `/host`, `/play/[code]`, `/display/[code]`, `/host/questions`.

Dependencies: none.

## Workstream C - Persistence + Realtime
Owner: implementation agent.

C1. Supabase schema/migrations for rooms, players, score_events, questions, hints, tags, question_sessions, buzz_cycles.
C2. RLS/server-authority model.
C3. Atomic `claim_buzz` database function.
C4. Realtime subscriptions and canonical state refetch.

Dependencies: B.

## Workstream D - Room/Lobby UX
Owner: implementation agent.

D1. Host room creation with capacity 2..10.
D2. Generate short room code.
D3. QR join surface.
D4. Player name/sound join.
D5. Lobby roster and seat ordering.
D6. Player reconnect token.
D7. 2/8/10 E2E coverage.

Dependencies: B, C room/player schema.

## Workstream E - Buzzer
Owner: implementation agent.

E1. Host Open/Close/Reset buzzer.
E2. Player large buzzer control.
E3. Server atomic first-winner claim.
E4. Winner state on Host and Display.
E5. Winner sound playback.
E6. Concurrency harness for 10 clients.

Dependencies: C, D.

## Workstream F - Scoring
Owner: implementation agent.

F1. Append-only score event API.
F2. Host quick adjustments.
F3. Custom delta.
F4. Undo latest score event.
F5. Live scoreboard derived from events.
F6. Adaptive 2-10 player TV layout.

Dependencies: C, D.

## Workstream G - Question Bank
Owner: implementation agent.

G1. Question list/search/filter.
G2. Create/edit form.
G3. Ordered hints editor.
G4. Answer/explanation/host-notes fields.
G5. Category/tags/difficulty/source/status.
G6. Archive/unarchive.
G7. Validation and persistence tests.

Dependencies: C question schema. Can run in parallel with E/F once shared foundation is stable.

## Workstream H - Live Questions
Owner: implementation agent.

H1. Select question for room.
H2. Create question-session snapshot.
H3. Host reveal prompt/hints/answer.
H4. Display reacts to reveal state.
H5. Finish/advance question.

Dependencies: E/F/G.

## Workstream I - QA / Release
Owner: CI + manager admission.

I1. Unit tests for state transitions.
I2. Multi-page Playwright game simulation.
I3. 2-player gauntlet.
I4. 8-player gauntlet.
I5. 10-player gauntlet.
I6. Refresh/reconnect gauntlet.
I7. Simultaneous buzz stress.
I8. Production smoke.

## First bounded implementation mission

**FOUNDATION_AND_ROOM_CONTRACT_V1**

Scope:
- B1-B5.
- C1 schema only (no premature full feature logic).
- Minimal domain types shared across Host/Player/Display.
- Tests that enforce capacity 2..10 and reject 1/11.

Acceptance:
- App builds.
- Typecheck/lint/tests pass.
- Route shells render.
- Database migration contains correct core entities and constraints.
- No feature scope beyond foundation.
