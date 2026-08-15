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

## Workstream C - Persistence + Realtime
C1. Schema/migrations for rooms, players, score events, questions, hints, question images, tags, question sessions, buzz cycles.
C2. Storage contract for question images and custom buzzer audio.
C3. RLS/server-authority model.
C4. Atomic `claim_buzz` database function.
C5. Realtime subscriptions and canonical state refetch.

## Workstream D - Room/Lobby UX
D1. Host room creation with capacity 2..10.
D2. Short room code + QR.
D3. Player name and individual sound selection.
D4. Built-in sound availability/de-duplication per active room.
D5. Optional custom short buzzer upload.
D6. Lobby roster/seat ordering.
D7. Reconnect identity including sound.
D8. 2/8/10 E2E coverage.

## Workstream E - Buzzer
E1. Host Open/Close/Reset.
E2. Player large buzzer control.
E3. Server atomic first-winner claim.
E4. Winner state on Host/Display.
E5. Winner-specific sound playback, built-in or custom.
E6. Concurrency harness for 10 clients.

## Workstream F - Scoring
F1. Append-only score events.
F2. Quick/custom adjustments.
F3. Undo latest score event.
F4. Live adaptive 2-10 scoreboard.

## Workstream G - Question Bank
G1. Question list/search/filter.
G2. Create/edit form.
G3. Ordered hints editor.
G4. Ordered photo upload/remove/reorder/preview.
G5. Answer/explanation/host notes.
G6. Category/tags/difficulty/source/status.
G7. Archive/unarchive.
G8. Validation/persistence/media tests.

## Workstream H - Live Questions
H1. Select question.
H2. Create immutable text/hint/image snapshot.
H3. Host reveal prompt/images/hints/answer.
H4. Display reacts to reveal state.
H5. Finish/advance question.

## Workstream I - QA / Release
I1. Unit tests for state transitions.
I2. Multi-page Playwright simulation.
I3. 2/8/10-player gauntlets.
I4. Refresh/reconnect gauntlet.
I5. Simultaneous buzz stress.
I6. Photo-question display/reconnect smoke.
I7. Custom-sound playback fallback smoke.
I8. Production smoke.

## First bounded implementation mission

**FOUNDATION_AND_ROOM_CONTRACT_V1**

Scope:
- App/CI/route foundation.
- Initial core database schema only.
- Schema must already accommodate ordered question images and built-in/custom player sounds to avoid later destructive migration.
- Capacity tests for 2..10.

Acceptance:
- Build/typecheck/lint/tests pass.
- Route shells render.
- Migration contains correct core entities and 2..10 constraints.
- Media schema supports photo questions and custom player sounds without implementing the full upload UI yet.
