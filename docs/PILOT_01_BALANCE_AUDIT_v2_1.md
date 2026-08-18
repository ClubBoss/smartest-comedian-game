# Pilot 01 — Balance Audit V2.1

## State

- `STATUS = REVIEW_ONLY_NOT_DEPLOYED`
- Audited artifact: `PILOT_01_BALANCED_DIFFICULTY_CANDIDATE_v2_1.md`
- Production Question Bank unchanged.
- Production packs unchanged.
- Runtime/deploy unchanged.

## Audit question

Did the difficulty wave overshoot into obscure, over-engineered trivia, or undershoot into reflex-speed buzzer questions?

## Verdict

**Overall: BALANCED CANDIDATE — suitable for a fresh blind review, not yet production approval.**

The V2.1 correction fixes the main V2 overreach by preserving the original story/payoff on 15 of 20 production slots and retaining only five underlying replacements whose original facts had strong recognition/self-solve problems.

No card is currently classified `TRIVIA_LOCKED` after Hint 2. Several cards are intentionally easier than the nominal cold target to provide pacing relief.

### Difficulty distribution

- Accessible / relief: 5 cards
- Core medium: 9 cards
- Hard start but strongly hintable: 6 cards
- Overly obscure / only-knowable: 0 cards
- Reflex-critical red flags: 0 cards, but 5 yellow cards should be watched in blind testing

## Matrix

| Slot | Card | Cold estimate | H2 estimate | Guess width | Payoff | Overthink risk | Easy risk | Verdict |
|---|---|---:|---:|---|---|---|---|---|
| A1 | Elmer McCurdy | 10–20 | 65–80 | High | High | Low | Low | PASS |
| A2 | Spider gift | 25–35 | 65–80 | Medium | High | Low | Medium | PASS / WATCH EASY |
| A3 | Groom of the Stool | 15–25 | 60–75 | High | High | Low | Medium-low | PASS |
| A4 | Bowerbird | 10–20 | 65–80 | High | High | Medium-low | Low | PASS |
| A5 | Berners Street | 30–45 | 65–80 | Medium | High | Low | Medium-high | PASS / DELIBERATE RELIEF |
| A6 | Apollo covers | 15–25 | 65–80 | High | High | Low | Low | PASS |
| B1 | Garlic test | 10–20 | 55–75 | Very high | High | Low | Low | PASS |
| B2 | Wife sale | 25–35 | 70–80 | High | High | Low | Medium | PASS / WATCH EASY |
| B3 | Cardiff Giant | 30–45 | 70–85 | Medium | Very high | Low | Medium-high | PASS / DELIBERATE RELIEF |
| B4 | Flatworm fencing | 10–20 | 65–80 | High | Very high | Low | Low | PASS |
| B5 | Poison Squad | 15–25 | 65–80 | High | Medium-high | Low | Low | PASS |
| B6 | Princess Caraboo | 5–15 | 55–75 | Very high | High | Medium-low | Low | PASS |
| F1 | Cuttlefish | 20–30 | 70–85 | Medium | High | Low | Medium | PASS / FINAL OPENER |
| F2 | Cadaver Synod | 15–25 | 70–85 | High | Very high | Low | Medium-low | PASS |
| F3 | Stork Derby | 10–20 | 65–80 | High | Very high | Low | Low | PASS |
| F4 | Roland the Farter | 2–8 | 65–80 | Very high | Very high | Low after H2 | Very low | PASS / HARD START |
| F5 | Radithor | 20–30 | 65–80 | Medium-high | High | Low | Medium | PASS / RELIEF |
| F6 | Thérèse Humbert | 10–20 | 65–80 | High | High | Medium-low | Low | PASS |
| F7 | Poyais | 25–35 | 70–85 | Medium | High | Low | Medium | PASS / WATCH EASY |
| F8 | Brinkley delayed A/B/C | 5–15 | 60–75 | Very high before H2 | Very high | Low | Low | PASS |

## Yellow watchlist — not automatic rewrites

### A2 Spider gift

The phrase `обман всё равно вскоре раскроется` naturally invites `он просто выигрывает время`. This is acceptable if the host requires the precise mating-time mechanism rather than accepting `чтобы обмануть/ради секса`.

**Recommendation:** keep for blind test. Rewrite only if multiple testers answer the exact mechanism immediately.

### A5 Berners Street

In an 1810 setting, a smart player may jump to letters quickly. This is intentionally tolerated as one of Qualifier A's relief cards.

**Scoring safeguard:** `письма` alone is incomplete; require mass fake orders/invitations and that recipients believed they were personally requested at that address.

### B2 Wife sale

Unofficial-divorce intuition is accessible. That is acceptable because the public-ritual angle still gives multiple versions and a strong payoff.

**Recommendation:** do not make it more legally technical unless human testing proves it reflex-easy.

### B3 Cardiff Giant

The fake-of-a-fake paradox is relatively easy once the court setup is heard. Keep it intentionally: it is funny, visual and gives a satisfying fast win after harder cards.

**Recommendation:** do not replace with the more obscure Biblical-origin question unless real players consistently answer before the host has finished the prompt.

### F7 Poyais

`People sailed to a promoted country and found the promises absent` can lead to `the country was fake` faster than ideal.

**Recommendation:** preserve for now because the story is simple and excellent. If blind testing shows >35–40% immediate correct solves, replace/re-angle only this slot; do not pre-emptively switch to Victor Lustig.

## Anti-overthinking findings

The following earlier V2 ideas are explicitly rejected for being too clever or too far from the original payoff:

- Berners Street -> exact wager question: REJECTED.
- Wife sale -> detailed legal protection from claims against the lover: REJECTED.
- Cardiff Giant -> religious argument origin: REJECTED.
- Cadaver Synod -> why exactly three fingers were cut off: REJECTED.
- Radithor -> which parts of the jaw were removed: REJECTED.
- Poyais -> replace with Victor Lustig: REJECTED.

These facts may be interesting, but they increase trivia specificity without enough show-value gain.

## Hint-ladder sanity check

All 20 cards now satisfy the intended qualitative ladder:

- H1 introduces a meaningful domain/direction.
- H2 is sufficient for an intelligent player to reason toward the core answer on every card.
- H3 nearly states or unmistakably points to the answer.

The hardest cold cards (`Princess Caraboo`, `Roland`, `Brinkley`) are not allowed to remain hard after H2.

## Pack-level pacing

### Qualifier A

Difficulty contour:

`medium -> accessible -> medium -> medium-hard -> relief -> medium-hard`

This avoids starting with a trivial speed question and avoids ending with an obscure wall.

### Qualifier B

Difficulty contour:

`medium-hard -> accessible -> relief -> medium-hard -> medium -> hard/super`

The easier Wife/Cardiff middle prevents Garlic + Flatworm + Caraboo from making the whole qualifier feel overly cerebral.

### Final

Difficulty contour:

`accessible opener -> medium -> medium-hard -> hard-start/comedy -> relief -> hard reasoning -> medium -> hard-start/delayed choices`

This is intentionally not monotonic. A continuously escalating difficulty curve would create fatigue and reduce comedy. Final should feel stronger through stakes and question quality, not simply through obscurity.

## Gate before production

Do not deploy or sync yet.

Next evidence should be a blind simulation/human test of the exact V2.1 wording. The most important measured signals are:

1. Was the exact answer spoken before Hint 1?
2. How many distinct plausible wrong theories appeared before the first correct answer?
3. At which hint was the answer first solved?
4. Did H2 create an earned `aha`, or was the player still stuck?
5. Did any question feel like obscure trivia rather than deduction?
6. Did any relief card become a pure speed-buzzer race?

Production approval should be based on that evidence, not further theoretical polishing alone.
