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

## 3. Actors

### Host
- Creates room.
- Sets capacity from 2 to 10.
- Starts/pauses/ends game.
- Selects current question.
- Opens/closes/resets buzzer.
- Reveals hints and answer.
- Awards/removes arbitrary points.
- Can undo latest score changes.
- Can remove/reorder players.
- Manages Question Bank content, including question images.

### Player
- Joins using room code or QR.
- Enters display name.
- Chooses an available built-in buzzer sound or uploads a short custom buzzer sound.
- Active players in one room should have distinct sounds.
- Sees own score and connection state.
- Buzzes when enabled.
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
- `prompt` optional when an image supplies the question stimulus
- `answer`
- `hints[]` ordered
- `assets[]` ordered, V1 asset type = image
- `hostNotes` optional
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
- Create question.
- Edit question.
- Upload/remove/reorder question images.
- Preview images before saving/use.
- Add/remove/reorder hints.
- Edit answer/explanation/notes.
- Archive/unarchive.
- Search/filter by text/category/tag/status.
- Select question into a live game.

A question must contain at least one learner-facing stimulus: non-empty text prompt or at least one image.

Question Bank is independent from room lifecycle. A live question session stores immutable snapshots of text, hints, answer/explanation and image metadata/storage references so later edits do not silently alter already-played history.

## 6. Live-game state machine

Room phases:

`LOBBY -> READY -> QUESTION -> BUZZ_OPEN -> BUZZ_LOCKED -> REVEAL -> QUESTION/ENDED`

Host may manually transition backward when recovery is needed.

### Buzz arbitration

- Host opens buzzer.
- Clients can submit buzz attempts.
- Server atomically accepts only the first valid attempt for the current buzz cycle.
- Accepted winner is broadcast to all clients.
- Client clock is never authoritative.
- Host can clear winner and reopen.

## 7. Scoring

- Default quick actions: -2, -1, +1, +2, +3.
- Custom numeric adjustment allowed.
- Score can be negative.
- Every score change records actor, player, delta, reason optional, timestamp.
- Host can undo last score transaction.

## 8. Individual buzzer sounds

- Every active player chooses one individual sound.
- V1 supports a safe built-in sound library.
- V1 data model also supports a player-uploaded short custom audio clip.
- Custom sound is stored as media content, not compiled into the app.
- Player sound identity survives reconnect.
- The UI should prevent accidental duplicate built-in choices among active players where practical.
- Winning sound is played on the shared display.
- Audio failure must never block buzz acceptance or scoring.
- Host can mute all sounds.

## 9. Realtime expectations

- State changes should normally appear in well under one second on a normal home connection.
- Correct ordering matters more than absolute millisecond fairness.
- Reconnect restores canonical room state.

## 10. Non-goals for V1

- Native iOS/Android apps.
- Public social network/accounts.
- AI-generated questions.
- Automated judging of free-form answers.
- Tournament brackets.
- Complex monetization.
- Video/audio chat.
- Exact esports-grade latency measurement.
- Video questions; V1 media scope is still images.

## 11. V1 acceptance scenario

A host creates a room for 8 players, shares QR, eight people join and each receives a distinct buzzer sound (built-in or custom). The host selects a saved question containing text and/or an image, reveals one hint, opens buzzers, two or more people press nearly simultaneously, exactly one winner is accepted, the display identifies that player and plays their sound, the host awards +2, all screens update, the host reveals the answer, then starts another question. The same flow must also work with 2 and 10 players.
