# Pilot 01 V2.3 — Acceptance Recheck

Status: `CANDIDATE_PASS_NOT_DEPLOYED`

This recheck evaluates the revised V2.3 candidate, including the F3 and F8 overrides. It does not authorize production mutation.

## Gates

- `PROMPT_DEPENDENCY_FAILURE`: prompt cannot reasonably generate the correct hypothesis before hints.
- `HINT_INSERTS_MISSING_FACT`: hint introduces the essential fact that should have been part of the task.
- `HINT_STATES_ANSWER`: a hint literally states the answer rather than narrowing to it.
- `REFLEX_RISK`: correct answer dominates immediately from prompt.
- `TRIVIA_LOCK`: knowing the anecdote is the only realistic cold path.
- `ANSWER_OVERPRECISION`: host requires a detail that players could not infer.

## Matrix after V2.3

| Slot | Card | Cold path exists? | 4+ wrong directions? | H1 direction only? | H2 solvable? | H3 avoids literal answer? | Answer gist scoreable? | Verdict |
|---|---|---|---|---|---|---|---|---|
| A1 | Elmer McCurdy | YES | YES | YES | YES | YES | YES | PASS |
| A2 | Spider gift | YES | YES | YES | YES | YES | YES | PASS |
| A3 | Groom of the Stool | YES | YES | YES | YES | YES | YES | PASS |
| A4 | Bowerbird perspective | YES | YES | YES | YES | YES | YES | PASS |
| A5 | Berners Street letters | YES | YES | YES | YES | YES | YES | RELIEF PASS |
| A6 | Apollo covers | YES | YES | YES | YES | YES | YES | PASS |
| B1 | Garlic test | YES | YES | YES | YES | YES | YES | PASS |
| B2 | Wife sale | YES | YES | YES | YES | YES | YES | RELIEF PASS |
| B3 | Cardiff Giant | YES | YES | YES | YES | YES | YES | RELIEF PASS |
| B4 | Flatworm fencing | YES | YES | YES | YES | YES | YES | PASS |
| B5 | Poison Squad | YES | YES | YES | YES | YES | YES | PASS |
| B6 | Princess Caraboo publicity | YES | YES | YES | YES | YES | YES | PASS |
| F1 | Cuttlefish split display | YES | YES | YES | YES | YES | YES | PASS |
| F2 | Cadaver Synod | YES | YES | YES | YES | YES | YES | PASS |
| F3 | Great Stork Derby | YES | YES | YES | YES | YES | YES | PASS |
| F4 | Roland missing third action | YES | YES | YES | YES | YES | YES | PASS |
| F5 | Radithor lead coffin | YES | YES | YES | YES | YES | YES | RELIEF PASS |
| F6 | Thérèse Humbert | YES | YES | YES | YES | YES | YES | PASS |
| F7 | Poyais | YES | YES | YES | YES | YES | YES | PASS |
| F8 | Mortsafe | YES | YES | YES | YES | YES | YES | PASS |

## Important changes versus V2.2

### Princess Caraboo
Old construction: asks for a specific former landlady with no way to infer that person from the prompt.

V2.3 construction: asks why newspaper fame destroyed the scam. Publicity logically creates the risk that someone from the impostor's real past will recognize her. The exact historical reveal — former landlady — is explanation detail rather than required cold knowledge.

### Roland
Old construction: asks for three arbitrary acts. Two of the three then appear in Hint 2.

V2.3 construction: prompt itself supplies jump + whistle and asks only for the third bizarre action. `fart/break wind` is now one of several plausible comic completions before hints; H2 and H3 narrow body mechanism without saying the word.

### Radithor
Old construction: prompt hides radioactivity; Hint 3 says radium and lead, effectively inserting both premise and answer.

V2.3 construction: prompt openly states radium and continuing radioactivity. The puzzle is now a real one-step inference: what material change to a coffin would shield radiation? Hints narrow toward radiation shielding and X-ray protection without saying `lead`.

### Bowerbird
Old construction: size-distance geometry exists only in hints; forced perspective is therefore impossible cold.

V2.3 construction: prompt supplies the observable gradient (small near, large far). The player must infer the visual effect. Hints discuss visual angle and perspective rather than introducing the pattern for the first time.

### Berners Street
Old V2.2 construction: asks the exact wager, a historical detail not inferable from the chaos itself.

V2.3 construction: each visitor believes they were personally expected; the player must infer the mass forged-personal-request mechanism. Letters are plausible cold but not uniquely forced; H1-H3 narrow method and era.

### Flatworm
Old construction: hermaphroditism appears only in Hint 1, even though it is essential to donor-vs-recipient reasoning.

V2.3 construction: hermaphroditism is in the prompt. The task is to infer why the two reproductive roles are in conflict.

### Poison Squad
Old construction: any experimental food variable could be correct until the hint supplies food-storage chemistry.

V2.3 construction: prompt tells players the bureau is investigating substances already added by food manufacturers; preservative/additive is now a plausible cold hypothesis. H2 makes the storage function explicit.

### Great Stork Derby
Old construction: 'several residents + a table' does not privilege childbirth at all.

V2.3 override: prompt gives women, a decade, a deceased lawyer and family events; Hint 1 reveals new children. The will condition is then deducible rather than delivered wholesale.

### F8 replacement
Brinkley is removed. Even with delayed A/B/C, the exact animal/tissue is trivia unless choices or a decisive animal clue are supplied; choices create a random/speed floor.

The accepted V2.3 replacement is the Scottish mortsafe question: a heavy iron cage protects a fresh grave only temporarily. The correct mechanism — protection from body-snatchers until decomposition removes the corpse's anatomical value — is one plausible hypothesis from the prompt and becomes strongly inferable by H1-H2.

## Remaining relief cards

Four cards are intentionally easier than the median:

- A5 Berners Street
- B2 Wife Sale
- B3 Cardiff Giant
- F5 Radithor

They are retained because the underlying stories and payoffs are strong and the pack should not feel like twenty identical hard riddles. They remain acceptable only while real play does not show repeated answers before the host finishes reading the prompt.

## Current candidate result

- Prompt-dependency failures: `0`
- Missing-fact hints: `0`
- Literal-answer hints: `0`
- Trivia-lock critical: `0`
- Answer-overprecision critical: `0`
- Structural candidate PASS: `20/20`
- Relief/ease watchlist: `4/20`
- Deployment: `NO`

## Stop rule

Do not keep desk-editing simply to make every card equally difficult. Next useful evidence after one final owner review is either a bounded blind-human sample or production deployment followed by real-play observation. Any further rewrite should be triggered by a specific observed failure: instant solve, dead air before H2, ambiguous scoring, or a hint that functionally reveals the answer.
