# Roadmap

## Phase 0 - Foundation
Goal: repository and contracts are stable before feature work.

Deliverables:
- Product Contract.
- Architecture decision.
- CI skeleton.
- Environment/config contract.
- Basic app shell.

Exit gate:
- Build, lint, typecheck and baseline tests pass.

## Phase 1 - Room + Lobby
Goal: 2-10 people can reliably enter one room.

Deliverables:
- Host creates room and chooses capacity 2..10.
- Room code + QR.
- Player join/name/sound selection.
- Host lobby roster.
- Shared display lobby.
- Reconnect identity.

Exit gate:
- Automated E2E for 2, 8 and 10 players.

## Phase 2 - Realtime Buzzer
Goal: trustworthy live buzz arbitration.

Deliverables:
- Host open/close/reset.
- Atomic first-winner RPC.
- Player button states.
- Winner broadcast/display.
- Winner sound.
- Concurrency test with 10 clients.

Exit gate:
- Repeated simultaneous-buzz tests never produce multiple winners.

## Phase 3 - Scoreboard
Goal: host can run a full question cycle manually.

Deliverables:
- Live score totals.
- Quick +/- controls.
- Custom delta.
- Append-only score events.
- Undo last score change.
- Dynamic display layout for 2-10.

Exit gate:
- Score remains correct across refresh/reconnect.

## Phase 4 - Question Bank
Goal: questions/hints/answers are managed as content, not code.

Deliverables:
- Question CRUD.
- Ordered hints.
- Answer/explanation/host notes.
- Categories/tags/status.
- Search/filter.
- Archive/unarchive.

Exit gate:
- Host can create a new question in UI and use it immediately without deploy.

## Phase 5 - Live Question Controller
Goal: question content integrates with the room without over-automating hosting.

Deliverables:
- Select saved question.
- Create immutable round snapshot.
- Show/hide prompt on Display.
- Reveal hints one at a time.
- Reveal answer/explanation.
- Advance to next question.

Exit gate:
- Complete V1 acceptance scenario passes.

## Phase 6 - Polish + Home Gauntlet
Goal: reliable one-evening experience.

Deliverables:
- Mobile ergonomic pass.
- TV readability pass.
- Connection-state indicators.
- Audio fallback/mute.
- Host recovery controls.
- Browser compatibility smoke.
- 2/8/10-player scripted gauntlets.

Exit gate:
- One full simulated game can run end-to-end with no manual database intervention.

## Post-V1 candidates
Only after real home-session evidence:
- Question packs/import/export.
- Multiple scoring presets.
- Lock-out after wrong answer and reopen to remaining players.
- Timer.
- Double points / steal / penalty presets.
- Host soundboard.
- Round history.
- Game templates beyond Smartest Comedian.
