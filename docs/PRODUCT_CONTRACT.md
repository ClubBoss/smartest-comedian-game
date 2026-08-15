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
7. **Players stay in the conversation.** A wrong answer never permanently or temporarily eliminates that player from the question; after the host resolves the answer, a fresh buzz cycle reopens to everyone.

## 3. Actors

### Host
- Creates room and sets capacity from 2 to 10.
- Starts/pauses/ends game.
- Builds or edits a question queue before/during the game.
- Selects/preloads current question privately.
- Opens/closes/resets/reopens buzzer.
- Reveals question stimulus, hints and answer independently.
- Resolves each answer as `+1`, `0`, or `-1` by default.
- Can enter any manual score delta for a special question/situation.
- Can undo latest score changes.
- Can manually assign/override a buzz winner as recovery.
- Can remove/reorder players.
- Manages Question Bank content, including question images.
- Can trigger a small fixed palette of ephemeral comedy reactions on the shared display; reactions never alter game state or history.

### Player
- Joins using room code or QR.
- Enters display name.
- Chooses an available built-in buzzer sound or uploads a short custom buzzer sound.
- Active players in one room should have distinct sounds.
- Sees own score and connection state.
- Buzzes when enabled.
- After any answer result, including `-1`, the same player is eligible again as soon as the host opens a new buzz cycle for that question.
- Reconnects after refresh without losing identity where possible.

### Shared Display
- Shows join QR/code in lobby.
- Shows scoreboard.
- Shows question text and/or question images only after host reveal.
- Shows buzzer state and first accepted player.
- Plays the winning player's individual buzzer sound when audio is enabled.
- Plays host-triggered ephemeral reaction cues when audio is enabled.
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

## 7. Buzz-cycle model

One question can contain any number of buzz cycles.

1. Host opens a cycle.
2. All active players are eligible.
3. First server-accepted buzz wins; all other buttons lock for that cycle.
4. Host hears the answer and resolves it (`+1`, `0`, `-1`, or manual score).
5. Host may reveal a hint, continue discussion, or immediately open another cycle.
6. New cycle means **all active players are eligible again, including the player who just answered**.
7. The cycle repeats until host reveals/finishes the question.

Client timestamps never decide the winner. Host can manually override the winner if a device/network issue makes recovery necessary.

## 8. Scoring

- Default answer buttons: `+1`, `0`, `-1`.
- `0` is a real recorded resolution even though the total does not change.
- Manual score adjustment accepts an arbitrary integer for special questions/situations.
- Every score event is append-only and records whether it came from normal answer resolution or manual adjustment.
- Optional free-text reason may be stored.
- Host can undo the latest score transaction without deleting history.

## 9. Individual buzzer sounds and host reactions

- Every active player chooses one individual sound.
- V1 supports a safe built-in sound library.
- Built-in sounds may be generated locally in-browser so routine play does not require uploaded audio assets.
- Data model supports a player-uploaded short custom audio clip.
- Custom sound is stored as media content, not compiled into the app.
- Player sound identity survives reconnect.
- UI should prevent accidental duplicate built-in choices among active players where practical.
- Winning sound is played on shared display.
- Audio failure never blocks buzz acceptance or scoring.
- Host can mute all sounds.
- Host has a small fixed reaction palette for comedy beats such as laughter, applause, surprise, booing and rimshot.
- Host reactions are host-authorized ephemeral Realtime events: they are not persisted, scored, or part of the live question state machine.

## 10. Reveal/privacy model

- Selecting/preloading a question does not reveal it to players/display.
- `stimulus_revealed` controls learner-facing text/image visibility.
- Hints and answer are independently revealed by the host.
- Host notes, acceptable variants and canonical answer remain host-only until explicitly revealed where applicable.

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
- Customizable/full host soundboard or jingle engine beyond the fixed reaction palette.

## 12. V1 acceptance scenario

A host creates a room for 8 players, shares QR, eight people join with distinct buzzer sounds, and the host prepares an ordered queue. A saved text/photo question is preloaded privately and then revealed. The host opens buzzers. Two or more players press nearly simultaneously; exactly one wins and everyone else locks for that cycle. The display identifies the winner and plays that player's sound. Host resolves the answer as `-1`; then opens a fresh cycle and the same player is eligible again together with everyone else. Another answer receives `0`; the game continues. A later answer receives `+1`, all scores update, then the host reveals the canonical answer and advances. The host may trigger a fixed comedy reaction on the shared display without changing any score or game state. A special question can use a manual score delta. The same flow works with 2 and 10 players.
