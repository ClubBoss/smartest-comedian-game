# Roadmap

## Phase 0 - Foundation
- Product/architecture authority.
- Next.js/TypeScript/CI shell.
- Core schema including 2..10 capacity, question images, custom sounds, +1/0/-1/manual scoring, queue, buzz attempts and immutable question snapshots.

Exit: build/lint/typecheck/tests green.

## Phase 1 - Room + Lobby
- Host creates room capacity 2..10.
- QR/code join.
- Name + distinct built-in/custom buzzer sound.
- Reconnect identity.
- Host/Display lobby.

Exit: 2/8/10-player E2E.

## Phase 2 - Realtime Buzzer
- Open/close/reset/reopen cycles.
- Server-atomic winner.
- Attempt logging.
- Same-player eligibility restored on every new cycle.
- Host winner override for recovery.
- Winner-specific sound.
- 10-client concurrency stress.

Exit: no multi-winner; repeated cycles permit any active player to buzz again.

## Phase 3 - Scoreboard
- Append-only answer/manual score events.
- Default +1 / 0 / -1 resolution.
- Manual arbitrary integer delta + optional reason.
- Undo.
- Adaptive 2-10 TV scoreboard.

Exit: canonical totals and zero-value resolutions survive refresh/reconnect.

## Phase 4 - Question Bank
- Text/photo questions.
- Ordered images and hints.
- Answer + acceptable variants + explanation + host notes.
- Categories/tags/difficulty/source/status.
- Search/filter/archive.
- Ordered room question queue.

Exit: host creates photo question and queues it without deploy.

## Phase 5 - Live Question Controller
- Start queued/manual question privately.
- Immutable text/media/answer-variant/host-note snapshot.
- Explicit reveal of prompt/images/hints/answer.
- Multiple buzz cycles per question with full re-eligibility each time.
- Score answer then reopen/continue as many times as host wants.
- Skip/advance queue.

Exit: complete V1 acceptance scenario.

## Phase 6 - Polish + Home Gauntlet
- Mobile ergonomics / TV readability.
- Connection indicators.
- Audio/media fallback.
- Host recovery controls.
- 2/8/10-player scripted gauntlets.
- Refresh/reconnect, photo, custom sound, repeated same-player answers and simultaneous-buzz stress.

Exit: full simulated evening needs no database intervention.

## Post-V1 candidates
Only after home-session evidence:
- Timer.
- Round templates.
- Double-points/steal presets.
- Host soundboard/jingles.
- Question import/export packs.
- More media types such as video.
- Public accounts/history/analytics.
