# Pilot 01 V2.4 — Final Pre-Deploy Editorial Audit

Status: `PREDEPLOY_EDITORIAL_PASS_NOT_DEPLOYED`

Audited candidate content commit: `80acd3d17f66145e4e79ac359a84139e670425b7`

This is the final adversarial desk/source gate before any V2.4 production sync. It does **not** mutate production and does **not** claim empirical human solve-rate proof.

## Acceptance contract

A card passes only if all of the following hold:

1. **Cold path exists** — the prompt itself contains enough information for the correct answer to be a reasonable hypothesis before any hint.
2. **No reflex domination** — the prompt does not make the correct answer overwhelmingly more obvious than all other reasonable versions.
3. **Version space exists** — players can produce several plausible wrong answers or mechanisms before hints.
4. **Hints narrow rather than repair** — H1/H2/H3 do not insert an indispensable premise that should have been in the prompt.
5. **No literal answer leak** — H3 may strongly narrow but does not simply state the answer.
6. **H2 is useful** — a good player should usually have a realistic path to the answer by H2; the game should not remain pure trivia until H3.
7. **Gist scoring works** — Host can score a semantically correct answer without requiring an arbitrary name, date, technical term or microscopic detail.
8. **Fact/source framing is defensible** — wording does not present a speculative interpretation as a proven fact.
9. **Pack balance survives** — not every card is equally hard; a small number of relief cards are deliberate, but no pack becomes a speed-buzzer block.

## Final 20-card matrix

| Slot | Card | Cold path | Reflex risk | Wrong-version space | H1/H2 curve | H3 leak | Gist score | Fact framing | Final verdict |
|---|---|---|---|---|---|---|---|---|---|
| A1 | Elmer McCurdy / fake relatives | PASS | LOW | STRONG | PASS | PASS | PASS | PASS | PASS |
| A2 | Spider fake gift / shortened mating | PASS | LOW-MED | STRONG | PASS | PASS | PASS | PASS | PASS |
| A3 | Groom of the Stool | PASS | MED | STRONG | PASS | PASS | PASS | PASS | PASS |
| A4 | Bowerbird forced perspective | PASS | MED | GOOD | PASS | PASS | PASS | PASS | PASS |
| A5 | Berners Street wager | PASS | MED-HIGH | GOOD | PASS | PASS | PASS | PASS | RELIEF PASS |
| A6 | Apollo insurance covers | PASS | LOW | STRONG | PASS | PASS | PASS | PASS | PASS |
| B1 | Ancient Egyptian garlic test | PASS | LOW-MED | STRONG | PASS | PASS | PASS | PASS | PASS |
| B2 | English wife sale | PASS | MED-HIGH | GOOD | PASS | PASS | PASS | PASS | RELIEF PASS |
| B3 | Cardiff Giant / fake versus fake | PASS | MED-HIGH | GOOD | PASS | PASS | PASS | PASS | RELIEF PASS |
| B4 | Flatworm self-insemination | PASS | LOW | STRONG | PASS | PASS | PASS | PASS | PASS |
| B5 | Poison Squad preservatives | PASS | MED | GOOD | PASS | PASS | PASS | PASS | PASS |
| B6 | Carlos Kaiser red-card escape | PASS | LOW-MED | STRONG | PASS | PASS | PASS | PASS* | PASS / QUALIFIER SUPER |
| F1 | Cuttlefish split-display limitation | PASS | LOW-MED | STRONG | PASS | PASS | PASS | PASS* | PASS |
| F2 | Cadaver Synod | PASS | MED | STRONG | PASS | PASS | PASS | PASS | PASS |
| F3 | Great Stork Derby | PASS | LOW | STRONG | PASS | PASS | PASS | PASS | PASS / TEAM |
| F4 | Roland missing third action | PASS | LOW-MED | VERY STRONG | PASS | PASS | PASS | PASS | PASS |
| F5 | Radithor lead coffin | PASS | HIGH | GOOD | PASS | PASS | PASS | PASS | RELIEF PASS |
| F6 | Thérèse Humbert legal-dispute mechanism | PASS | LOW | STRONG | PASS | PASS | PASS | PASS | PASS |
| F7 | Poyais paper-state | PASS | LOW-MED | STRONG | PASS | PASS | PASS | PASS | PASS / LAST |
| F8 | Scottish mortsafe | PASS | LOW | VERY STRONG | PASS | PASS | PASS | PASS | PASS |

`PASS*` means the wording intentionally distinguishes direct observation/reporting from a plausible explanatory interpretation. For Carlos Kaiser, the detailed episode is presented in journalistic/documentary accounts and the explanation is phrased as reported participant history. For the cuttlefish, the geometry/multiple-rival explanation is treated as an explanation of the observed pattern, not an experimentally proven universal law.

## Changes admitted by the final adversarial cycle

The V2.3 `20/20` desk pass was deliberately attacked again and did not survive unchanged. Six slots received material V2.4 corrections:

- **A2 Spider** — V2.3 made early termination too obvious. V2.4 asks why a fake gift can still win the start of mating but produce a worse reproductive result.
- **A5 Berners Street** — V2.3 made `letters` the reflex 1810 answer. V2.4 returns to the wager, but supplies enough outcome evidence to infer `make the address the most talked-about in London`.
- **B4 Flatworm** — penis-fencing became reflexive after making hermaphroditism self-contained. Replaced with hypodermic self-insemination: isolated worms can inject their own sperm into their tissues, including the head region, with sperm apparently migrating toward fertilization.
- **B6 Princess Caraboo → Carlos Kaiser** — the self-contained Caraboo rewrite overcorrected into `publicity -> someone recognized her`, which was too automatic. Kaiser becomes the qualifier-super decision puzzle: when forced to play, how can a serial football impostor create an official reason not to enter the match?
- **F1 Cuttlefish** — V2.3 directly asked the obvious male-to-female / female-to-rival mapping. V2.4 gives that known behavior and instead asks why the trick is safer with one rival than with several.
- **F4 Roland** — V2.3 still asked for an arbitrary third act. V2.4 constrains the search class in the prompt (short bodily act, no object or hands) while preserving broad comic guess space.

## Pack-level balance

### Qualifier A — 6

Shape: `medium -> medium -> medium -> medium -> relief -> medium-hard`

No consecutive reflex cards. Berners Street is the single deliberate breathing-space card before the Apollo super question.

### Qualifier B — 6

Shape: `medium -> relief -> relief -> medium-hard -> medium -> medium-hard/super`

B2/B3 are the only consecutive easier pair in the whole Pilot. This is accepted because they use very different reasoning and payoff styles (social custom versus fake-object legal absurdity), and the second half of the pack immediately returns to harder reasoning. If real players repeatedly answer both before the host finishes reading, one of them should be replaced after Pilot 01 rather than desk-edited again.

### Final — 8

Shape: `medium-hard -> medium -> hard -> medium-hard/comic -> relief -> hard -> hard -> hard`

The Final is meaningfully harder overall without becoming eight trivia locks. Radithor is the deliberate mid-final relief card; the final three cards then require mechanism/reconstruction reasoning.

## Hint policy verified

Across the effective V2.4 candidate:

- H1 primarily changes direction or eliminates broad families of guesses.
- H2 supplies a strong constraint and should make the question realistically solvable.
- H3 approaches the answer but avoids literal answer strings / exact historical names where those are the requested answer.
- A strong H3 is allowed; a missing-premise H3 is not.

## Answer policy verified

Host Notes were reviewed against the new principle: **score the idea, not trivia precision**.

Examples:

- Elmer McCurdy: `pretended to be relatives/brothers` is enough; no names needed.
- Princess Caraboo is removed rather than requiring `former landlady`.
- Carlos Kaiser: deliberate fight/red card to avoid playing is enough; the chairman-insult detail is bonus context.
- Flatworm: self-injecting own sperm through the body is enough; no Latin term or exact puncture location.
- Great Stork Derby: most children within the ten-year window + inheritance is enough; no exact amount.
- Mortsafe: body-snatchers + temporary need until decomposition destroys anatomical value is enough.

## Source/factual gate

The final wave rechecked the claims most vulnerable to overstatement:

- spider fake gifts: fake gifts can still yield mating, but females terminate mating sooner, reducing transfer opportunity;
- bowerbird size-distance gradients: forced-perspective court construction is supported by peer-reviewed work;
- flatworm self-insemination: isolated *Macrostomum hystrix* show hypodermic self-insemination, with sperm observed in anterior/head tissues and interpreted as migrating toward fertilization;
- cuttlefish split display: males can direct male courtship coloration toward a female and female-like coloration toward a single rival; the multiple-rival explanation is kept explicitly interpretive;
- Berners Street wager, Radithor lead-lined coffin, Stork Derby, Cadaver Synod and mortsafe mechanics retain the already reviewed historical/source backing;
- Carlos Kaiser is treated as reported/journalistic participant history rather than court-record-level certainty.

No remaining card was found to require a factual claim that materially exceeds its cited source.

## Final gate totals

- `PROMPT_DEPENDENCY_CRITICAL = 0`
- `REFLEX_CRITICAL = 0`
- `HINT_INSERTS_MISSING_PREMISE = 0`
- `HINT_LITERAL_ANSWER = 0`
- `H2_DEAD_AIR_CRITICAL = 0`
- `ANSWER_OVERPRECISION_CRITICAL = 0`
- `AMBIGUOUS_SCORING_CRITICAL = 0`
- `SOURCE_OVERCLAIM_CRITICAL = 0`
- `PACK_BALANCE_CRITICAL = 0`
- `PASS_OR_RELIEF_PASS = 20/20`

## What “100% ready” means here

V2.4 is **100% through the defined editorial + source + adversarial desk gates**. That is the strongest claim available before exposing the cards to fresh humans.

It is **not** a claim that real-player cold-solve percentages are known with certainty. Only a blind human sample or Pilot 01 itself can supply that empirical evidence. Further desk rewriting without such evidence is now classified as diminishing returns and carries a real risk of degrading natural language or recreating the too-easy / impossible-cold oscillation seen in earlier waves.

## Stop / deployment recommendation

`FURTHER_DESK_EDITORIAL = STOP`

`V2_4_EDITORIAL = ACCEPT_FOR_PRODUCTION_SYNC`

`PRODUCTION_SYNC = NOT_EXECUTED`

Next safe action, only after owner approval, is one guarded in-place V2.4 Question Bank sync preserving the existing 20 UUIDs and exact 6/6/8 pack order, followed by strict production read-back. Photos and reserve/tiebreak cards remain separate later work.
