# Pilot 01 Difficulty Revision V1 — Review Candidate

## State

- `STATUS = REVIEW_ONLY_NOT_DEPLOYED`
- Base `main`: `44b0a42aea9dd6bb034d312a5abc6e74d0f26ac0`
- Production runtime/content: unchanged.
- Production Question Bank: unchanged.
- Canonical production snapshot `docs/PILOT_01_PRODUCTION_CONTENT.json`: unchanged.
- Pack shape remains `6 / 6 / 8`.
- This candidate must pass a separate blind difficulty audit before any production sync or deploy decision.

## Goal

Prevent Pilot 01 from collapsing into a reflex-speed buzzer game.

Target behavior:
1. Prompt alone should create several plausible wrong theories.
2. Most ordinary questions should have roughly 10–30% estimated cold-solve probability for an educated adult group.
3. Final should generally be harder than qualifiers.
4. Hint 1 gives direction, Hint 2 narrows the search space, Hint 3 makes the answer strongly reachable.
5. A prompt must not give both the cause and consequence and then ask players merely to connect them.
6. Known trivia with high recognition risk can be replaced even if the fact itself is entertaining.

## Delta

### Replaced entirely — 5

1. Qualifier A #1: Mary Smith / knocker-up -> **Elmer McCurdy funhouse corpse**
   - Reason: knocker-up is culturally familiar and the original tube/window setup was strongly self-solving.
2. Qualifier A #4: Mummy Brown -> **great bowerbird forced perspective**
   - Reason: `Mummy Brown` plus an ingredient question almost names its own answer; the fact is also common trivia.
3. Qualifier B #4: NASA toilet camera -> **flatworm penis fencing**
   - Reason: camera + toilet + self-view made centering the obvious first guess.
4. Final #3 Team: Hanoi rat tails -> **Great Stork Derby**
   - Reason: bounty-for-tail plus tailless live rats exposes the incentive exploit almost completely; also a relatively well-known cobra-effect example.
5. Final #8 A/B/C: heroin -> **John Brinkley goat-gland surgery**
   - Reason: heroin as a historical morphine substitute is comparatively recognizable and the old options made B stand out too strongly.

### Major rewrites — 10

- Spider gift: answer now requires the *mechanism* (wrapping delays discovery and buys mating time), not merely “to mate”.
- Berners Street: removes the explicit “without internet/phone” cue and requires fake personalized letters/orders.
- Apollo insurance covers: removes “left to their families” from the prompt.
- Wife sale: asks why the ritual needed publicity/witnesses rather than simply why couples did it.
- Cardiff Giant: asks for the legal paradox rather than narrating most of the answer.
- Poison Squad: no longer states that researchers were adding controversial preservatives before asking why.
- Cuttlefish: requires both simultaneous audience-specific signals.
- Radithor: removes “real radium” from the prompt and requires both material + reason.
- Thérèse Humbert: changes from the obvious “what was in the safe?” to the mechanism that sustained creditor trust for years.
- Poyais: asks what made the fraud categorically different from bad land, rather than “what was wrong with the investment?”

### Minor rewrites — 2

- Groom of the Stool: removes the “maximally personal place” cue.
- Cadaver Synod: retains the strong scene but asks what formal event they were staging.

### Kept essentially intact — 3

- Garlic test
- Princess Caraboo
- Roland the Farter

These already have low prompt-only solve rates, multiple plausible wrong guesses, and useful hint ladders.

## Candidate pack structure

### Qualifier A

1. Elmer McCurdy — funhouse corpse
2. Spider gift — delayed-discovery mechanism
3. Groom of the Stool
4. Great bowerbird — forced perspective
5. Berners Street Hoax
6. Apollo insurance covers — Super

### Qualifier B

1. Garlic
2. Wife sale
3. Cardiff Giant
4. Flatworm penis fencing
5. Poison Squad
6. Princess Caraboo — Super

### Final

1. Cuttlefish tactical deception
2. Cadaver Synod
3. Great Stork Derby — Team
4. Roland the Farter
5. Radithor / lead coffin
6. Thérèse Humbert
7. Poyais — Last
8. John Brinkley goat glands — A/B/C

## Source verification for new identities

- Elmer McCurdy: American Association for State and Local History / Oklahoma museum history.
- Great bowerbird forced perspective: peer-reviewed Royal Society work, accessible through PMC.
- Flatworm penis fencing: peer-reviewed review on sexual conflict in simultaneous hermaphrodites, accessible through PMC.
- Great Stork Derby: contemporary TIME reporting on Millar's will and the ten-year baby race.
- John R. Brinkley: peer-reviewed medical-history review in PMC.

## Estimated cold-solve profile

The candidate deliberately avoids pretending these estimates are human-test measurements. They are a pre-human editorial simulation for relative calibration.

- Qualifier A: mostly 15–35%.
- Qualifier B: mostly 5–35%.
- Final: mostly 2–30%; the final A/B/C has a structural 33% random-guess floor.

### Watchlist for the next blind audit

These are intentionally **not closed yet**:

- `A3 Groom of the Stool` — could still be too recognizable to history/trivia-heavy players.
- `A5 Berners Street` — fake letters may remain the dominant inference too early.
- `B3 Cardiff Giant` — once the word “copy” is heard, “original was fake too” may still arrive quickly.
- `F5 Radithor` — some players may infer lead/radiation from the scientific-tonic framing even without the word radium.
- `F8 Brinkley A/B/C` — multiple choice always has a 33% chance floor; next audit should test whether this is desirable as the show-ending mechanic.

## Explicitly deferred

- No photos or image selection in this wave.
- No reserve/tiebreak questions in this wave.
- No production Question Bank mutation.
- No production pack mutation.
- No merge to `main`.
- No deploy.

## Next gate

Run a fresh blind difficulty audit against only the candidate wording, without using the previous answers as a starting point.

For every slot classify:
- `PASS`
- `REWRITE_AGAIN`
- `REPLACE_AGAIN`

Only after that audit should an approved content revision be transformed into a production import/update payload.
