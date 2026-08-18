# Pilot 01 — Difficulty Gauntlet V2

## State

- `STATUS = REVIEW_ONLY_NOT_DEPLOYED`
- Production Question Bank unchanged.
- Production packs unchanged.
- Runtime/deploy unchanged.
- This audit evaluates the V1 difficulty candidate; it does not approve production sync.

## Product target

The desired game is not a speed-buzzer quiz and not an obscure-trivia exam.

Target solve curve for a smart adult comedy group:

| Stage | Target solve probability | Desired player experience |
|---|---:|---|
| Prompt only | 5–20% (ordinary), usually <=15% in Final | Several plausible wrong theories; no obvious single association |
| Hint 1 | 25–40% | A direction appears, but multiple branches remain |
| Hint 2 | 55–75% | A good reasoner can now reach the answer |
| Hint 3 | 85–95% | Near-solve; prevents dead air |

A good card must satisfy all of these simultaneously:

1. Prompt does not contain both cause and effect when the answer is merely the bridge between them.
2. Prompt supports at least 4 plausible wrong theories.
3. Exact answer is not common viral trivia with a high recognition rate.
4. Hint 1 changes the search space rather than restating the setup.
5. Hint 2 makes the card genuinely solvable by reasoning.
6. Hint 3 nearly closes the card.
7. The reveal remains funny, absurd or surprising even after reasoning has led toward it.
8. The scoring answer remains short and host-judgeable.

## Executive verdict

The V1 difficulty revision was directionally correct but is **not yet production-ready**.

Recommended V2 decisions across 20 slots:

- KEEP / tiny polish: 6
- IMPROVE AGAIN (prompt/hint curve): 12
- REPLACE / re-angle to a different fact: 2

The two strongest structural replacements/re-angles are:

- `F7 Poyais` -> Victor Lustig / Eiffel Tower victim silence.
- `B3 Cardiff Giant` keeps the Cardiff subject but replaces the self-solving fake-of-a-fake angle with the origin story: the Biblical-giants argument that inspired George Hull.

Several other slots keep the same historical/biological fact but need a different question angle.

---

## Matrix — Qualifier A

### A1 — Elmer McCurdy

**Current V1:** asks why the unburied corpse began travelling through fairs.

- Prompt cold solve: **20–30%** — too high for the target because `real corpse + funhouse + fairs` strongly suggests commercial exhibition.
- Wrong-answer width: **good** (museum specimen, evidence, medical specimen, bounty display, carnival exploitation).
- Hint 1: useful but still broad.
- Hint 2: almost solves the current version.
- Recognition risk: low.
- Comedy/reveal: excellent.

**Decision: IMPROVE AGAIN; keep the story.**

**Better angle:** the fake relatives who finally got the corpse away from the undertaker.

Proposed prompt:

> Через несколько лет после смерти грабителя Элмера Маккарди к гробовщику приехали двое мужчин, назвались его давно потерянными братьями и пообещали наконец похоронить тело. Гробовщик отдал им покойника. Почему после этого Маккарди вместо кладбища снова оказался на гастролях?

Answer:

> «Братья» были карнавальными шоуменами, которые выдали себя за родственников, чтобы забрать прибыльный труп-экспонат.

Hints:

1. До этого гробовщик уже отвергал предложения людей из шоу-бизнеса купить тело.
2. Новые «родственники» профессионально работали с ярмарочными аттракционами.
3. Они не были братьями Маккарди вообще.

Expected curve: **10–15 / 30–40 / 65–75 / 95%**.

Source: `https://www.aaslh.org/the-birth-of-an-exhibit/` (candidate source; the exact fake-brother detail should receive one final source check before production).

---

### A2 — Pisaura spider gift

**Current V1:** asks what exact advantage wrapping a worthless gift gives.

- Prompt cold solve: **35–50%** — still too transparent; `wrapped fake + later discovery` naturally suggests delayed detection.
- Wrong-answer width: medium.
- Recognition risk: low-medium.
- Reveal: strong adult/comedy tone.

**Decision: MAJOR RE-ANGLE; keep the fact/species.**

Better prompt:

> Самцы Pisaura mirabilis иногда дарят самке красивый шёлковый свёрток, внутри которого вместо еды — мусор или пустая оболочка. Эксперимент показал странный результат: мошенники начинали спаривание почти так же успешно, как честные самцы, но всё же платили за обман одной конкретной репродуктивной «ценой». Какой?

Answer:

> Самка раньше прекращала спаривание, поэтому мошенник успевал передать меньше спермы.

Hints:

1. Наказание происходило уже **после** начала спаривания.
2. Самка контролировала, сколько оно продолжится.
3. Чем раньше она обнаруживала пустой подарок, тем раньше прекращала спаривание и тем меньше спермы успевал передать самец.

Expected curve: **10–15 / 25–35 / 65–80 / 95%**.

Primary research supports shorter mating and reduced sperm transfer with worthless gifts: `https://pmc.ncbi.nlm.nih.gov/articles/PMC3228764/`.

---

### A3 — Groom of the Stool

**Current V1:** better than production, but `звучала унизительно + настолько приватный доступ` still nudges toward toilet.

- Cold solve: **20–30%**.
- Wrong-answer width: excellent (dressing, bathing, shaving, bed, food, medicine, toilet).
- Hint ladder: good.
- Recognition risk: medium among trivia/history players.

**Decision: MINOR IMPROVEMENT.**

Proposed prompt:

> При дворе Тюдоров человек с одной бытовой обязанностью мог получить почти невероятный политический доступ к королю: слышать личные разговоры, передавать просьбы и влиять на назначения. Какую именно повседневную обязанность он выполнял?

Hints:

1. Это не еда, одежда и не охрана.
2. Во время этой процедуры король обычно оставался почти без свидетелей.
3. В английском названии должности было слово `Stool`.

Expected curve: **15–20 / 30–40 / 60–70 / 90–95%**.

---

### A4 — Great bowerbird forced perspective

**Current V1:** contains the geometric solution in the setup (`small near / large far + fixed viewpoint`).

- Cold solve: **45–65%** for visually literate players — severe miss.
- Wrong-answer width: low once the geometry is stated.
- Fact/reveal: excellent and relatively uncommon.

**Decision: MAJOR IMPROVEMENT; keep fact, hide geometry until hints.**

Proposed prompt:

> Самец большого шалашника часами раскладывает перед шалашом камни, раковины и косточки. Если исследователи ночью всё перемешивают, утром он настойчиво возвращает предметы почти в прежний порядок. Что именно он пытается восстановить для самки — это не прочность, не удобная дорожка и не просто симметрия?

Answer:

> Оптическую иллюзию принудительной перспективы, усиливающую его брачную демонстрацию.

Hints:

1. Самка рассматривает площадку почти всегда из одной и той же точки.
2. Размер предметов систематически меняется с расстоянием от этой точки.
3. Мелкие предметы ближе, крупные дальше — получается forced perspective.

Expected curve: **10–15 / 25–35 / 65–75 / 95%**.

---

### A5 — Berners Street Hoax

**Current V1:** even after removing `internet/phone`, mass arrivals in 1810 still make letters/orders the dominant first answer.

- Cold solve: **40–55%**.
- Wrong-answer width: weak-medium.
- Topic: excellent.

**Decision: MAJOR RE-ANGLE; keep Berners Street but ask about the bet, not the logistics.**

Proposed prompt:

> В 1810 году Теодор Хук устроил у дома на Бернерс-стрит настоящий апокалипсис доставок: торговцы, врачи, священники, экипажи и важные персоны приезжали один за другим. Это было не местью хозяевам и не способом заработать. Какое пари Хук пытался этим выиграть?

Answer:

> Он поспорил, что сможет за неделю сделать любой выбранный дом самым обсуждаемым адресом Лондона.

Hints:

1. Ставка была не на число доставок и не на сумму ущерба.
2. Спор касался **известности самого адреса**.
3. Он обещал сделать выбранный дом самым обсуждаемым в Лондоне всего за неделю.

Expected curve: **5–10 / 20–30 / 60–75 / 95%**.

London Museum explicitly records the one-guinea bet to make any house the most talked-about address in London within a week.

---

### A6 — Apollo insurance covers (Qualifier Super)

- Current cold solve: **15–20%**.
- Wrong-answer width: good (souvenir, authentication, postal ritual, charity, family keepsake, financial backup).
- Hint 1: directional without solving.
- Hint 2: strong narrowing toward insurance.
- Hint 3: near-solve.
- Recognition risk: low-medium.

**Decision: KEEP; only wording polish if needed.**

Expected curve: **15–20 / 30–40 / 65–75 / 90–95%**.

This is close to the target model.

---

## Matrix — Qualifier B

### B1 — Ancient Egyptian garlic test

- Cold solve: **10–20%**.
- Wrong-answer width: excellent (discharge, color, pain, urine, pregnancy reaction, smell elsewhere, physical change).
- Hint 1: rules out inspecting the garlic itself.
- Hint 2: `намного выше` creates a useful direction.
- Hint 3: nearly solves.
- Recognition risk: low-medium.

**Decision: KEEP.**

Expected curve: **10–20 / 25–35 / 55–70 / 90–95%**.

---

### B2 — English wife sale

**Current V1:** the contrast `sale not legally valid -> why public?` still strongly suggests unofficial divorce/social recognition.

- Cold solve: **35–50%**.
- Wrong-answer width: medium.
- Topic/punchline: strong.

**Decision: MAJOR RE-ANGLE; keep the historical practice.**

Proposed prompt:

> При английской «продаже жены» покупатель иногда был известен заранее и фактически никакого аукциона не происходило. Зачем тогда мужу, жене и этому мужчине всё равно было выгодно провести сделку публично при свидетелях?

Answer:

> Публичный ритуал показывал, что муж согласился на разрыв и отказывается от претензий; это защищало нового партнёра от будущих требований или иска со стороны мужа.

Hints:

1. После «продажи» жена нередко уходила жить именно с покупателем.
2. Без такого согласия муж мог юридически преследовать её любовника и требовать деньги.
3. Публичная «продажа» служила доказательством: прежний муж добровольно отпустил её к новому партнёру.

Expected curve: **5–10 / 25–35 / 70–80 / 95%**.

History.com notes that the buyer was often the wife's new lover and explains the risk of an adultery (`criminal conversation`) action by the first husband.

---

### B3 — Cardiff Giant

**Current V1 fake-of-a-fake angle:** still essentially self-solving because the question asks what fact about the owners' exhibit made a lawsuit absurd.

- Cold solve: **60–75%**.
- Wrong-answer width: poor.
- Image potential: excellent.
- Underlying story has a much better angle.

**Decision: RE-ANGLE TO A DIFFERENT CARDIFF FACT.**

Proposed prompt:

> Джордж Халл потратил большие по тем временам деньги, чтобы тайно вырезать десятифутового «окаменевшего гиганта», состарить его и закопать на ферме, где его позже «случайно» нашли. Деньги были не единственной мотивацией. Какой обычный спор за два года до этого подал Халлу идею такой дорогой мистификации?

Answer:

> Он поспорил со священником о буквальной правдивости библейского упоминания гигантов и решил продемонстрировать человеческую доверчивость.

Hints:

1. Спор был не об археологии и не о бизнесе.
2. Оппонент Халла ссылался на конкретный религиозный текст.
3. Речь шла о библейской фразе о гигантах, живших на Земле.

Expected curve: **5–10 / 20–30 / 55–70 / 95%**.

Smithsonian and Smithsonian collections both connect Hull's motive to an argument over the literal Biblical claim that giants once lived on Earth.

---

### B4 — Flatworm penis fencing

**Current V1:** `both hermaphrodites + stab each other + dodge` almost states donor-versus-recipient conflict.

- Cold solve: **35–50%**.
- Wrong-answer width: medium.
- Recognition risk: medium-high because `penis fencing` is viral biology trivia.
- Comedy value: extremely high.

**Decision: IMPROVE AGAIN, but keep for now rather than replace.**

Proposed prompt:

> У некоторых морских плоских червей ухаживание выглядит как дуэль: два партнёра пытаются проткнуть друг друга пенисом. Но они не дерутся за самку и не пытаются прогнать конкурента. Какой конфликт между двумя партнёрами вообще делает такую «дуэль» выгодной?

Answer:

> Оба — гермафродиты, и каждый предпочитает выступить донором спермы, одновременно избегая затратной роли получателя и травматического осеменения.

Hints:

1. У этих животных нет постоянного разделения на самцов и самок.
2. Каждый участник способен и отдавать, и получать сперму, но две роли не равноценны по затратам.
3. Оба стараются стать донором и избежать прокола/осеменения как получатель.

Expected curve: **15–20 / 30–40 / 65–75 / 95%**.

Research reviews support a donor/recipient sexual conflict and traumatic insemination; host copy must avoid the inaccurate meme formulation that the loser simply `becomes female`.

---

### B5 — Poison Squad

- Cold solve: **15–25%**.
- Wrong-answer width: excellent (calories, pathogens, alcohol, vitamins, additives, adulteration, allergens).
- Hint 1: useful elimination.
- Hint 2 (`Poison Squad`): strong but not exact.
- Hint 3: near-solve.
- Recognition risk: low.

**Decision: KEEP.**

Expected curve: **15–25 / 30–40 / 55–70 / 90–95%**.

---

### B6 — Princess Caraboo (Qualifier Super)

- Cold solve: **5–10%**.
- Wrong-answer width: excellent (linguist, diplomat, sailor, relative, police, servant, pirate, newspaper reader).
- Hint ladder: strong progressive narrowing.
- Recognition risk: low.
- Reveal: strong human-absurdity payoff.

**Decision: KEEP; tiny Hint 2 polish only.**

Suggested Hint 2: `Её лицо и история попали в газеты далеко за пределами дома, где она гостила.`

Expected curve: **5–10 / 20–30 / 55–70 / 90–95%**.

---

## Matrix — Final

### F1 — Cuttlefish split display

**Current V1:** `one female + one competitor + different body sides` gives enough structure to infer courtship-vs-deception fairly quickly.

- Cold solve: **25–35%**.
- Wrong-answer width: medium.
- Fact/reveal: excellent.

**Decision: MAJOR IMPROVEMENT; keep fact.**

Proposed prompt:

> Исследователи траурных каракатиц заметили редкий трюк: иногда один самец буквально делит тело на две разные визуальные половины одновременно. Почти всегда это происходит в очень конкретной группе из трёх каракатиц. Какая расстановка делает такой трюк полезным и что видят два разных зрителя?

Answer:

> Самец находится между одной самкой и одним самцом-соперником: самке показывает мужской брачный рисунок, сопернику — женскую окраску.

Hints:

1. Один зритель должен заинтересоваться им, а второй — перестать считать его соперником.
2. С одной стороны находится самка, с другой — единственный самец-конкурент.
3. Самка видит брачного самца, конкурент видит «самку».

Expected curve: **10–15 / 30–40 / 65–75 / 95%**.

---

### F2 — Cadaver Synod

**Current V1:** corpse on throne + deacon speaking for him makes `trial` an obvious reconstruction.

- Cold solve: **50–70%**.
- Wrong-answer width: poor-medium.
- Story itself is outstanding.

**Decision: MAJOR RE-ANGLE; ask about the punishment rather than identifying the trial.**

Proposed prompt:

> В 897 году мёртвого папу Формоза действительно выкопали и формально судили. После обвинительного приговора его не просто раздели и снова похоронили: у трупа отрезали три пальца правой руки. Почему выбрали именно эти три пальца?

Answer:

> Это были пальцы, которыми папа совершал благословения/освящения; наказание символически лишало силы его папские действия.

Hints:

1. Выбор был символическим, а не связанным с причиной смерти.
2. Эти пальцы имели функцию именно в церковных ритуалах.
3. Ими папа давал благословения.

Expected curve: **5–15 / 25–35 / 60–75 / 95%**.

PubMed and historical accounts explicitly describe the amputation of three right-hand fingers used for blessing.

---

### F3 — Great Stork Derby (Team)

**Current V1:** `several women + families + decade + standings` over-cues childbirth.

- Cold solve: **30–45%**.
- Wrong-answer width: medium.
- Story/reveal: excellent.

**Decision: MAJOR IMPROVEMENT; hide gender/family cues from prompt.**

Proposed prompt:

> После смерти торонтского адвоката Чарльза Миллара газеты почти десять лет вели «турнирную таблицу» нескольких обычных жителей города. Это не были спортсмены, кандидаты или предприниматели, но позиции в таблице реально менялись из-за событий в их частной жизни. Что считалось и какой приз ждал победителя?

Answer:

> Считали, какая женщина родит больше всего детей в Торонто за десять лет; победительнице предназначалась основная часть состояния Миллара.

Hints:

1. Все лидеры таблицы оказались женщинами.
2. Позиция менялась после событий в родильных домах.
3. В завещании было обещано состояние матери, родившей больше всего детей за десять лет.

Expected curve: **5–10 / 20–30 / 65–80 / 95%**.

---

### F4 — Roland the Farter

**Prompt is excellent**, but V1 hint ladder is too slow: even after Hint 2 there are hundreds of arbitrary court performances.

- Cold solve: **2–5%**.
- Wrong-answer width: enormous.
- H1 current: broad.
- H2 current: still too broad.
- H3 current: finally near-solve.

This violates the new target in the opposite direction: fun but not sufficiently **deducible by Hint 2**.

**Decision: KEEP PROMPT/ANSWER; strengthen hints.**

New hints:

1. Это был короткий физический номер, а не деньги, еда или подарок.
2. В условии уже были **один прыжок и один свист**; не хватает третьего одновременного действия.
3. Третье действие выполнялось задней частью тела — именно за него Роланда и запомнили.

Expected curve: **2–5 / 15–25 / 60–75 / 95%**.

This is the model for `hard cold / easy with hints` once the ladder is fixed.

---

### F5 — Radithor / Eben Byers

**Current lead-coffin angle:** an `unusual protective material in a coffin` strongly cues lead/radiation even without saying radium.

- Cold solve: **30–45%**.
- Wrong-answer width: medium-low.
- Story contains a much stronger, less self-solving horror payoff.

**Decision: MAJOR RE-ANGLE; keep Byers/Radithor.**

Proposed prompt:

> Миллионер Эбен Байерс несколько лет ежедневно пил дорогой «лечебный» тоник Radithor и даже советовал его друзьям. К концу жизни повреждения стали настолько чудовищными, что за две операции врачи удалили почти целиком какую часть его лица?

Answer:

> Практически всю верхнюю челюсть и большую часть нижней.

Hints:

1. Главная проблема разрушала кость, а не кожу или глаза.
2. Повреждение было сосредоточено вокруг рта.
3. Ему удалили почти всю верхнюю и большую часть нижней челюсти.

Expected curve: **5–15 / 25–35 / 65–80 / 95%**.

Historical medical reporting describes removal of nearly all of his upper jaw and much of the lower jaw before death from radium poisoning.

---

### F6 — Thérèse Humbert

- Cold solve: **10–20%**.
- Wrong-answer width: good (forged will, bribed bankers, fake relatives, fake court files, fake vault inspections, political connections).
- Hint 1 current is a little abstract.
- Hint 2 gives a strong causal route.
- Hint 3 nearly solves.
- Recognition risk: low.

**Decision: KEEP WITH HINT-1 POLISH.**

Suggested Hint 1:

> Ей нужно было не только «доказать», что деньги есть, но и постоянно объяснять, почему их прямо сейчас нельзя показать никому.

Expected curve: **10–20 / 30–40 / 65–75 / 90–95%**.

---

### F7 — Poyais (Last)

**Current V1:** `land + bonds + currency + settlers sailed there + more radical than bad land` very strongly suggests fictional country.

- Cold solve: **45–65%**.
- Wrong-answer width: poor.
- Recognition risk: medium among scam/history fans.

**Decision: REPLACE.**

Recommended replacement: **Victor Lustig — why the first Eiffel Tower victim stayed silent.**

Proposed prompt:

> В 1925 году мошенник Виктор Люстиг убедил парижского торговца металлом Андре Пуассона, что французское правительство тайно продаёт Эйфелеву башню на лом, получил деньги и уехал из страны. Люстиг ожидал огромного скандала — но в газетах не появилось вообще ничего. Почему молчание жертвы оказалось настолько полным, что мошенник решился вернуться в Париж и попробовать продать башню второй раз?

Answer:

> Пуассон постыдился признаться полиции и публике, что его так легко обманули; к тому же он заплатил «чиновнику» взятку, что делало признание ещё унизительнее/опаснее для репутации.

Hints:

1. Люстиг не запугивал Пуассона и не имел над ним юридической власти.
2. Чтобы убедить Пуассона в своей «чиновничьей» подлинности, Люстиг ещё и намекнул на взятку — и получил её.
3. Обманутому торговцу было слишком стыдно публично признаться и в покупке башни, и во взятке фальшивому чиновнику.

Expected curve: **10–15 / 25–35 / 65–80 / 95%**.

The official Eiffel Tower site and Smithsonian both report that Poisson was too embarrassed to press/report charges; Smithsonian also records the bribe element.

---

### F8 — Brinkley goat glands / A-B-C

**Current V1:** options shown in the prompt create an unavoidable **33% random-hit floor**, which is contrary to the anti-reflex goal.

- Knowledge cold solve: <15%.
- Random cold solve: 33%.
- Wrong-answer width: artificially only two wrong branches.
- Comedy: excellent.
- Mechanic can be saved without removing A/B/C completely.

**Decision: KEEP FACT, CHANGE WHEN A/B/C APPEARS.**

Recommended structure:

Prompt (open-ended):

> В 1920-е шарлатан Джон Бринкли стал миллионером, обещая мужчинам вернуть половую силу хирургической «пересадкой желез». Что он на самом деле помещал пациентам в область мошонки?

Hint 1:

> «Донор» вообще не был человеком.

Hint 2 — only now reveal choices:

> A. Козлиные яички  
> B. Обезьяньи надпочечники  
> C. Бычий гипофиз

Hint 3:

> Бринкли особенно любил козлов как символ мужской половой силы.

Answer:

> A. Козлиные яички / ткань козлиных половых желез.

Expected curve: **10–15 / 30–40 / 60–75 (choices now appear) / 95%**.

This preserves the final A/B/C flavour while eliminating the 33% random guess before any reasoning has happened.

---

## Pack-level balance after recommended V2 changes

### Qualifier A

1. Elmer McCurdy fake brothers — 10–15% cold
2. Spider cheating penalty — 10–15%
3. Groom of the Stool — 15–20%
4. Bowerbird restoration/illusion — 10–15%
5. Berners Street bet — 5–10%
6. Apollo insurance covers — 15–20%

Expected character: broad funny guesses early; most cards become reachable by Hint 2.

### Qualifier B

1. Garlic breath — 10–20%
2. Wife sale legal protection — 5–10%
3. Cardiff Biblical argument — 5–10%
4. Flatworm sex-role conflict — 15–20%
5. Poison Squad — 15–25%
6. Princess Caraboo — 5–10%

Expected character: approximately equal difficulty to A, slightly more reasoning-heavy but not knowledge-heavy.

### Final

1. Cuttlefish three-animal arrangement — 10–15%
2. Cadaver Synod blessing fingers — 5–15%
3. Stork Derby — 5–10%
4. Roland — 2–5% cold, but deliberately much easier at Hint 2
5. Radithor jaw — 5–15%
6. Thérèse Humbert — 10–20%
7. Victor Lustig victim silence — 10–15%
8. Brinkley open-first / A-B-C-on-Hint-2 — 10–15%

Expected character: Final is harder cold than qualifiers but does not become an obscure-knowledge wall; Hint 2 should still produce a large wave of viable answers.

## Final recommendation

Do **not** deploy V1 candidate.

Prepare `difficulty_revision_v2` with the exact changes above, then run one more blind audit using the following pass gate:

- no card estimated >25% cold solve;
- no ordinary card estimated <50% after Hint 2;
- at least 4 plausible wrong branches at prompt stage;
- no answer exposed by title/image/category on the player/display surface;
- no common-trivia recognition trap unless the question angle is uncommon;
- Final A/B/C options must not be visible before Hint 2;
- images remain deferred until this text difficulty gate passes.
