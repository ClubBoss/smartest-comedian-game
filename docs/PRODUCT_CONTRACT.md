# Product Contract V1

## 1. Problem

A home group needs a low-friction tool to run a comedy quiz game with 2-10 players. The software manages realtime participation and game state while leaving social/comedic judgment to the human host.

## 2. Core principles

1. **Human host is authority.** The system assists; it does not over-automate comedy or scoring.
2. **Phones are controllers.** Players should spend minimal time looking down.
3. **TV/display is shared truth.** Score, buzz winner, question media and reveal state are visible to everyone.
4. **Questions are content.** Text, photos, hints, answers and metadata are editable without deployments.
5. **Fast recovery beats rigid automation.** Host gets manual overrides.
6. **Identity includes sound.** Every active player has an individual buzzer sound.
7. **Wrong answers can extend comedy.** A wrong answer may lock only that player out while the host reopens the same question to everyone else.

## 3. Actors

### Host
- Creates room and sets capacity from 2 to 10.
- Starts/pauses/ends game.
- Builds or edits a question queue before/during the game.
- Selects current question.
- Opens/closes/resets/reopens buzzer.
- Can mark a buzz winner wrong and exclude that player from the next buzz cycle for the same question.
- Reveals hints and answer.
- Awards/removes arbitrary points.
- Can classify score events as correct-answer, bonus, penalty or manual.
- Can undo latest score changes.
- Can remove/reorder players.
- Manages Question Bank content, including question images.

### Player
- Joins using room code or QR.
- Enters display name.
- Chooses an available built-in buzzer sound or uploads a short custom buzzer sound.
- Active players in one room should have distinct sounds.
- Sees own score and connection state.
- Buzzes when enabled and eligible.
- If ruled wrong, can be locked out from subsequent buzz cycles for that question while others continue.
- Reconnects after refresh without losing identity where possible.

### Shared Display
- Shows join QR/code in lobby.
- Shows scoreboard.
- Shows question text and/or question images when the host reveals them.
- Shows buzzer state and first accepted player.
- Plays the winning player's individual buzzer sound when audio is enabled.
- Shows hints/answer/explanation only according to host reveal state.

## 4. Player-count rule

- Minimum to start: 2.
- Maximum supported: 10.
- Host chooses room capacity between 2 and 10.
- Layouts adapt automatically.
- No logic may assume exactly 8 players.

## 5. Question model

A reusable question can be text-only, image-assisted, or image-led. It contains:

- `id`
- `prompt` optional when an image supplies the stimulus
- `answer`
- `answerVariants[]` optional acceptable phrasings/examples for the host
- `hints[]` ordered
- `assets[]` ordered, V1 asset type = image
- `hostNotes` optional and never learner-facing
- `explanation` optional
- `category` optional
- `tags[]` optional
- `difficulty` optional
- `sourceLabel` optional
- `sourceUrl` optional
- `status`: draft | ready | archived
- `createdAt`
- `updatedAt`

V1 editor requirements:
- Create/edit question.
- Upload/remove/reorder question images.
- Preview images.
- Add/remove/reorder hints.
- Edit answer, acceptable variants, explanation and host-only notes.
- Archive/unarchive.
- Search/filter by text/category/tag/status.
- Add questions to an ordered live-game queue.

A question must contain at least one learner-facing stimulus: non-empty text prompt or at least one image.

Question Bank is independent from room lifecycle. A live question session snapshots text, images, hints, answer, acceptable variants, explanation and host notes so later edits cannot rewrite a played round.

## 6. Question queue

- Host can prepare an ordered queue before play.
- Host can reorder, skip, remove or insert queued questions during the evening.
- Starting a queued question creates an immutable live snapshot.
- Queue order is convenience, not authority: the host may select any ready question manually.

## 7. Live-game state machine

Room phases:

`LOBBY -> READY -> QUESTION -> BUZZ_OPEN -> BUZZ_LOCKED -> REVEAL -> QUESTION/ENDED`

Host may manually recover backward/forward where safe.

### Buzz arbitration

- Host opens buzzer.
- Eligible clients submit buzz attempts.
- Server atomically accepts only the first valid attempt for the current buzz cycle.
- Client clock is never authoritative.
- Host can clear/reset.
- If the winner is wrong, host may start a new buzz cycle for the same question excluding that player (and any earlier wrong players).
- Exclusion is per question/cycle, not a permanent player penalty.

## 8. Scoring

- Default quick actions: -2, -1, +1, +2, +3.
- Custom numeric adjustment allowed.
- Score can be negative.
- Every change is append-only and classified as one of: `correct`, `bonus`, `penalty`, `manual`.
- Optional free-text reason may explain subjective awards such as a strong argument or funny answer.
- Host can undo the latest score transaction without deleting history.

This explicitly supports the show's useful mechanic: points are a social/comedic tool, not only a correctness counter.

## 9. Individual buzzer sounds

- Every active player chooses one individual sound.
- V1 supports a safe built-in sound library.
- Data model supports a player-uploaded short custom audio clip.
- Custom sound is stored as media content, not compiled into the app.
- Player sound identity survives reconnect.
- UI should prevent accidental duplicate built-in choices among active players where practical.
- Winning sound is played on shared display.
- Audio failure never blocks buzz acceptance or scoring.
- Host can mute all sounds.

## 10. Realtime expectations

- State changes should normally appear in well under one second on a normal home connection.
- Correct ordering matters more than absolute millisecond fairness.
- Reconnect restores canonical room state and buzz eligibility.

## 11. Non-goals for V1

- Native iOS/Android apps.
- Public social network/accounts.
- AI-generated questions.
- Automated judging of free-form answers.
- Tournament brackets.
- Complex monetization.
- Video/audio chat.
- Exact esports-grade latency measurement.
- Video questions; V1 media scope is still images.
- Full round/tournament rules engine.
- Host soundboard/jingle system.

## 12. V1 acceptance scenario

A host creates a room for 8 players, shares QR, eight people join with distinct buzzer sounds, and the host prepares an ordered queue. A saved text/photo question starts from the queue. The host reveals a hint and opens buzzers. Two or more players press nearly simultaneously; exactly one wins. The display identifies that player and plays their sound. If the answer is wrong, the host marks a penalty if desired and reopens the same question excluding that player. Another player wins, receives a correct/bonus score event, all screens update, then the host reveals the answer and advances. The same flow works with 2 and 10 players.
