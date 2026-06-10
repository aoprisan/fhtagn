# FHTAGN — Idle Redesign Direction

> *"That is not dead which can eternal lie."*
> Tagline: **the cult grows while you sleep.**

A design-direction document: where to take FHTAGN as a **true idle game**. The current
build (`FHTAGN_Game_Spec.md`) is a real-time multiplayer *clicker* — chant-heavy,
PvP-flavored, session-based. This doc proposes the pivot to a genuine idle: the numbers
must grow while the player is away, absence must be rewarded with a story, and the
signature mechanic — the Sanity gamble — must move from side-meter to the center of the
design.

The thesis: **cosmic horror is the best theme idle games have never properly used.**
The genre's core fantasy — *vast forces accumulating without you* — is literally the
Mythos. Cthulhu dreams; the cult recruits itself; the stars align on geological time.
We don't have to fight the theme to make this idle. We have to stop fighting the genre.

---

## 1. What's wrong today (the honest audit)

1. **Chanting is the engine.** Tap-to-earn is the *clicker* genre, not idle. Walk away
   and (except for the Cthulhu patron boon) nothing happens. An idle game's first law:
   the engine runs without you; activity *accelerates*, never *enables*.
2. **No generator ladder.** The dopamine spine of every great idle — buy a thing that
   earns, then a thing that buys the thing — is absent. There is nothing to *build*.
3. **No personal prestige.** The Awakening is a server-wide season reset. The player has
   no individual "reset for permanent power" loop, which is the retention engine of the
   genre (Cookie Clicker's ascension, AdCap's angels).
4. **Real-time PvP fights idle pacing.** Being struck by a Cataclysm while asleep is the
   worst feeling available in games. Synchronous offence and offline accumulation are
   structurally incompatible; one must yield, and in an idle game it's PvP.
5. **Sanity is a meter, not a dial.** The delve/recover gamble — the one genuinely novel
   system here — is something you visit, not something you *set and live with*. Idle
   games are about configuring a machine and watching it run; risk should be a
   configuration.

Everything else — the globe, the Roil, wards, bargains with hidden catches, patrons,
sigils, the season race — survives, repurposed. This is a re-centering, not a rebuild.

---

## 2. The new core loop

```
TEND (minutes)  →  DELVE (the gamble)  →  SLEEP (hours)  →  RETURN (the story)
      ↑                                                            |
      └────────────  AWAKEN (personal prestige)  ←────────────────┘
                              ↓ (across seasons)
                     THE CYCLE (world prestige)
```

1. **Tend** — spend devotion on the cult ladder, tend wards, trace sigil rituals,
   answer a bargain. A check-in is 2–5 minutes of meaningful choices.
2. **Delve** — set your Sanity stance: how deep the cult reaches for forbidden power
   while you're gone. Deeper = faster = more likely something terrible happens.
3. **Sleep** — close the tab. The cult recruits, the Roil falls, catches spring,
   the stars drift. The world does not pause; it *accumulates*.
4. **Return** — the **Dream Journal**: a generated "while you slept…" report. This is
   the best screen in the game (Section 7).
5. **Awaken** — when growth flattens, perform the Awakening: the god *stirs*, your cult
   is consumed, and you keep **Marks** — permanent power for the next, faster run.

---

## 3. The cult ladder (generators) — the cult recruits itself

Replace chant-as-engine with a **recruitment chain** (Swarm Simulator topology, which is
unusually on-theme: exponential cult growth *is* the horror):

| Tier | Unit | Produces | Flavor |
|---|---|---|---|
| 0 | **Devotion** | — (the currency) | The harvested awe of the converted. |
| 1 | **Whisperers** | Devotion / sec | They tell stories in taverns and comment sections. |
| 2 | **Acolytes** | Whisperers / sec | Each convert converts. |
| 3 | **Covens** | Acolytes / sec | Thirteen in a basement with a mimeograph. |
| 4 | **Temples** | Covens / sec | A congregation that files taxes. |
| 5 | **Drowned Choirs** | Temples / sec | They sing below the waterline. |
| 6 | **Silent Cities** | Choirs / sec | Whole towns that stopped answering letters. |
| 7 | **Dream-Seeds** | Cities / sec | R'lyeh, budding. |

- Higher tiers unlock per-run; costs follow the standard geometric curve; upgrades
  (bought with Devotion, gated by Lore) multiply tiers — all conventional on purpose.
  The ladder is the *familiar* spine that carries the *unfamiliar* systems below.
- **Chant survives, demoted to accelerant:** tapping whips the cult into **Frenzy** — a
  short global production multiplier with a decaying combo. Active play is always the
  fastest play; it is never the *only* play.
- **Sigils survive, promoted to rituals:** tracing a sigil casts a timed ritual —
  Harvest (collect a burst), Vigil (ward maintenance), Lucidity (sanity restore), Frenzy
  extension. Drawing complexity still scales with power. The gesture stays the weighty,
  autoclicker-proof verb; it just points inward now instead of at other players.

---

## 4. Sanity becomes the throttle (the signature system)

Sanity stops being a meter you manage and becomes **the stance you set on the machine** —
the risk dial that makes this idle unlike any other:

| Stance | Production | While you're away… |
|---|---|---|
| **Lucid** | ×1 | Safe. Slow. The cosmos ignores you. |
| **Veiled** | ×2 | Occasional Roil attention; minor defections possible. |
| **Delving** | ×4 | Bargain catches spring harder; wards erode faster; the journal starts lying. |
| **Unravelled** | ×8+ | The patron *notices you*. Catastrophes are probabilistic, large, and narrated. |

- The stance drains or restores Sanity over time; deep stances are unsustainable —
  you must surface. The loop is *delve → gain → claw back → delve again*, now running
  **while offline**, which is what makes it a gamble rather than a timer: you commit
  before you sleep and find out what it cost when you return.
- **Hallucinated UI** (already prototyped) graduates to a core feature: below a sanity
  threshold the game *lies* — phantom strikes, numbers that shimmer and disagree,
  bargain offers that were never made, a Dream Journal with entries that didn't happen
  (marked only by the faintest tell, for those who learn to read it). No state changes;
  pure epistemic dread. No other idle game does this. Lean in hard.
- Catastrophes must stay **probabilistic and meaningful** (defection waves, ward
  collapse, a stolen tier of generators) — never a deterministic tax, or the stance
  collapses into a solved multiplier (the spec's #1 flag, still the #1 flag).

---

## 5. Prestige — the Awakening becomes personal

Two layers, mapped onto lore that already exists:

### Layer 1 — **The Stirring** (per-run, hours → days)
When growth flattens, trace the Great Sigil (the most ornate gesture in the game). Your
patron **stirs in its sleep**: the cult is consumed — devotion, ladder, upgrades reset —
and you receive **Marks of the Old Ones**, scaled to lifetime devotion. Marks buy
permanent multipliers, starting tiers, sanity capacity, ward inheritance.

- **Rededication:** at each Stirring you may switch patron. Patrons become **run
  modifiers** (Cthulhu: offline gains +; Dagon: coastal-cell spread +; Hastur: thrives
  at low sanity, fragile when lucid; Shub-Niggurath: ladder breeds itself faster /
  higher upkeep). Asymmetric strategies across prestiges = replay variety without
  new content.

### Layer 2 — **The Cycle** (seasonal, weeks)
The shared-world Convergence and reseed survive as the *outer* prestige: when the season
ends (a cult completes the Great Rite, or the stars time out), the world reseeds and all
players receive **Elder Truths** — a meta-currency for the permanent tree that persists
across Cycles. Season placement (Section 6) scales the payout.

Revelations stay computed-from-counters; **Lore** becomes the collection metagame —
fragments of forbidden tomes uncovered by spread and delving, each a small permanent
bonus plus a paragraph of story. Idle players are completionists; feed them.

---

## 6. Multiplayer demotes to an asynchronous race (keep the globe, lose the missiles)

The 3D globe is the franchise image — keep it as the **season board**, not the arena:

- **Cells** (real cities) are claimed and grown by cults — players and bots — via the
  existing spread/conversion mechanics. Your reach on the planet is your idle empire
  made visible. Watching your stain spread across the night side of Earth is the
  premium screenshot.
- **PvP becomes conversion, not damage.** Contested cells resolve by *committed
  devotion over time* (async, attrition, idle-friendly), not by strikes that delete a
  sleeping player's numbers. Hastur keeps its flip identity here. Damage-band rites
  (Whisper/Manifestation/Cataclysm) retire from PvP and return as PvE ritual tiers.
- **The Roil stays** exactly as built — the indifferent cosmos is the *shared* antagonist,
  and a shared antagonist is what makes an async race feel like a multiplayer game.
  Wards remain the maintenance subgame (they erode; tending them is the check-in
  incentive; never reducible to zero risk).
- **The Awakening race** is the season leaderboard: Convergence climbs server-wide,
  first cult to the Great Rite wakes its god, everyone watches the cinematic, Cycle
  payouts follow placement. Dread of *losing the race* replaces dread of being attacked
  — same push-past-safe-play pressure, none of the offline griefing.

---

## 7. Offline is the product: the Dream Journal

The return screen is where an idle game is actually *played*, so make it the best thing
we ship. On return, generate a narrated report from the offline simulation log:

> *While you dreamt (7h 14m):*
> *The choirs sang. **+4.2e9 devotion.***
> *The Roil fell on Valparaíso. The wards held. Mostly.*
> *Nyarlathotep's third bargain came due. You will find the catch in the east wing.*
> *Eleven covens in Marseille stopped writing. We do not speak of why.*
> *…and one entry that may not have happened at all.*

- Soft cap offline accrual (e.g. full rate 8h, decaying to 50% by 24h) so check-ins
  matter; **Deep Dreaming** (subscription perk) raises the cap.
- Web push (PWA, already planned) fires on the *story*, not the grind: a bargain about
  to come due, wards about to fail, Convergence crossing a threshold, the season's
  final hours. Every notification is a hook with fiction attached.
- Daily ritual: **"the stars align"** — a once-per-day alignment bonus (daily-login
  retention, in-fiction).

---

## 8. Monetization (idle-adjusted)

- **High Priest subscription:** 2× devotion (keep), Deep Dreaming offline cap, ornate
  ritual sigils, +1 bargain slot, cosmetic globe FX. Early-renewal +20% (keep).
- **Cosmetics:** sigil ink styles, cult heraldry on the globe, journal themes.
- **Never sell safety:** sanity restores and ward repairs must be earnable in-loop.
  Selling "skip the gamble" deletes the signature system. Sell *time* and *style*, not
  *outcomes*. (2–5% conversion planning baseline stands.)

---

## 9. What this costs and what it keeps (engineering view)

The architecture seam survives untouched — this is mostly `MockGameClient` and catalog
work, and the offline simulation is *easier* than realtime PvP:

| Verdict | System |
|---|---|
| **Keep as-is** | Globe, cells/seeding, the Roil + wards, bargains (hidden catch), sigil recognizer, patrons, Convergence/season reseed, tiers/auth, PWA plan. |
| **Repurpose** | Chant → Frenzy accelerant. Sigils → rituals. Rites → PvE ritual tiers. Awakening → two-layer prestige. Leaderboards → season placement. |
| **New** | Generator ladder (`catalog.ts` growth), sanity stances, offline simulation + Dream Journal (deterministic fast-forward from `last_seen` — one function, no realtime infra), Marks/Elder Truths trees, Lore collection. |
| **Retire** | Real-time PvP strikes, damage bands vs. players, `rite_incoming` telegraphs against humans. |

Offline fast-forward note: simulate coarse ticks (e.g. 5-min steps) from the last seen
timestamp through the ladder, stance odds, ward erosion, and pending bargain catches;
emit journal entries as you go. Same function powers bots, which keeps the world's
night side alive at low CCU — answering the spec's world-density question for free.

---

## 10. Build order

1. **Ladder + offline core:** generators in catalog, fast-forward sim, Dream Journal v1.
   *(The game becomes an idle game here; everything after is flavor and depth.)*
2. **Sanity stances:** four stances, offline catastrophe rolls, hallucinated journal
   entries. Prototype the gamble balance first — still the highest-risk unknown.
3. **The Stirring:** Marks, rededication, patron run-modifiers.
4. **Async world:** conversion-by-attrition on the globe, season placement → Elder
   Truths, retire realtime strikes.
5. **Retention shell:** push notifications, stars-align daily, Lore collection.
6. **PWA + Stripe** (unchanged from the original spec).

---

## 11. Open questions

- **Stance granularity:** four named stances vs. a continuous slider? (Named stances
  read better in the journal: *"You spent the night Unravelled."* Recommend names.)
- **Catastrophe floor:** how bad can an offline night get before it's churn instead of
  drama? (Hypothesis: never more than ~30% of a run's progress, always narrated, never
  silent.)
- **Hallucination tell:** should low-sanity journal lies be detectable by a learnable
  tell, or truly indistinguishable? (Recommend a faint tell — paranoia with mastery is
  more fun than noise.)
- **FOOM:** every system here reskins 1:1 onto the AI spinoff (stance = "scaling
  policy," journal = "training log," the Stirring = "checkpoint reset"). Keep the seam.
