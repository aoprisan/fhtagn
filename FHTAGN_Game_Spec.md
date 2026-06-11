# FHTAGN — Game Specification

> *"Ph'nglui mglw'nafh Cthulhu R'lyeh wgah'nagl fhtagn."*
> Tagline: **the stars are right.**

A real-time, multiplayer **cult clicker on a 3D globe**. Players found a cult cell in a
real city, chant to gather devotion, trace sigils to invoke eldritch power, spread
across a living planet, and race rival cults to **awaken a sleeping god** — while the
indifferent cosmos strikes at random and forbidden power eats their sanity.

This document is the build spec. It is written to be fed directly to a coding agent
(Claude Code). It assumes an **existing prototype** (a real-time city-growth clicker
with PvP missiles) that is being **reframed**, not rebuilt from zero. Where a concept
maps to something already in the codebase, the mapping is called out explicitly.

---

## 1. Reskin mapping (old prototype → FHTAGN)

The underlying systems mostly survive; the theme and a few mechanics change. Treat this
as the migration key.

| Existing concept | Becomes | Notes |
|---|---|---|
| City population (`total_clicks`) | **Devotion** of a cult cell | Same counter, renamed. |
| Click | **Chant** (tap/hold) | Baseline low-friction input; unchanged mechanically. |
| Missile | **Rite** (eldritch power) | Now *invoked by drawing a sigil*, not a button. |
| City marker on globe | **Cult cell** marker | Seeded from GeoNames as before. |
| Spectator / Builder / Warrior | **Witness / Initiate / High Priest** | Same auth tiers, renamed. |
| Achievements (computed) | **Revelations** (computed) | Same derived-from-counters approach. |
| Kill leaderboard | **Devotion / Reach / Lore** leaderboards | Combat is secondary to spread. |
| Daily snapshot / % change | Unchanged | Keep snapshot worker. |
| Subscription expiry downgrade | Unchanged | High Priest → Initiate on lapse. |

New systems with no prototype equivalent (Sections 6–9): **Sanity/Power meter**,
**Nyarlathotep bargains**, **the Roil** (random strikes), **patron factions**,
**the Awakening** endgame.

---

## 2. Tech stack (keep existing)

- **Backend:** Go 1.24, Chi router, SQLite (WAL), WebSocket hub. Versioned,
  transactional migrations. Background workers (snapshots, subscription expiry, and new:
  the Roil tick + Awakening check).
- **Frontend:** React 19 + TypeScript, Vite, Three.js globe via `react-globe.gl`.
  Single WebSocket serving spectators and players alike; optimistic updates reconciled
  by the server.
- **Distribution:** **PWA-first** (installable, offline shell, web push). Bill via Stripe
  — no app-store cut, sidesteps app-store content review entirely.
- **Realtime core:** input → optimistic client update → WebSocket → server rate-limit →
  SQLite transaction → broadcast → revelation/sanity checks.

---

## 3. Core gameplay loop

> **v2 (the Liturgy update):** the loop gained a spend step — see §17 for the full
> re-evaluation and rationale. Devotion is now a *currency*, not just a score.

1. **Chant** to gather devotion (and grow your personal contribution).
2. **Spend** devotion on the **Liturgy** — followers (devotion per second) and
   litanies (chant multipliers) — so the numbers compound instead of crawling.
3. **Trace a sigil** to invoke a Rite — an eldritch power cast on a target cell; a
   share of what it tears loose is **harvested** back into your own cell.
4. **Spread** to neighbouring cells; convert the uncommitted; court **Nyarlathotep's
   bargains** for power.
5. **Endure the Roil** (random cosmic strikes) and gamble your **Sanity** against
   **the Veil** (madness pays — and bleeds), while edging toward **the Awakening**.

The moment-to-moment is chant-heavy and low-friction; the strategic beats are the
liturgy, sigils, bargains, and spread.

---

## 4. Input model — chant + sigil (IMPORTANT)

Two verbs. Do **not** replace clicking wholesale with gestures.

### Chant (baseline)
- A tap or press-hold. Cheap, fast, mindless — preserves idle accessibility and the
  speed-skill mechanic (chants-in-10-seconds → "Fast Tongue" revelation).
- Server rate-limited exactly like the old click. Optimistic on the client.

### Sigil (the weighty verb)
- Drawing a sigil **invokes a Rite** (offensive power, summon, or patron boon) or
  **seals a bargain**. This is the reskinned "missile fire."
- Implementation: client-side stroke recognition (use a `$1` / `$P` point-cloud
  recogniser — small, dependency-light). On a successful match, send **one
  `rite_invoke` event** over the existing WebSocket carrying `{rite_id, target_cell_id}`.
  The server never sees raw points — same atomic event shape as a click.
- **Difficulty scales with power:** Tier I sigils are a single stroke (≈ as fast as a
  tap); Tier II/III are multi-stroke and ornate. Friction grows with investment.
- **Fail gracefully:** a poor match wastes the gesture but never punishes (no resource
  loss); show ghost-guide on first uses, fade with mastery.
- Raises the autoclicker bar on the actions that matter (offence), without taxing the
  accumulation loop.

---

## 5. Player tiers & auth (frictionless, unchanged model)

| Tier | Auth | Chant power | Rites | Notes |
|---|---|---|---|---|
| **Witness** | none | — (read-only) | — | Watches the living world over WS. Zero-friction try. |
| **Initiate** | cookie `user_id` (UUID, no password) | 1× | Revelation rites (basic sigils) | Default for any registered player. |
| **High Priest** | subscription (weekly/monthly) | 2× | Revelation rites **+** ornate sigil tiers, forbidden tomes, faster rites | Premium combatant. |

- Early renewal (within 48h of expiry) grants **+20% duration bonus** (keep).
- On expiry: auto-downgrade to Initiate; remove High-Priest-only sigil progression (keep
  existing downgrade worker, renamed).

---

## 6. Patrons (factions) — choose one to serve

Replaces "pick a city" with "pick a patron." Asymmetric; gives the metagame
rock-paper-scissors texture. Store `patron_id` on the user/cell.

> **v2:** patrons were flavor-only; each is now a distinct playstyle with concrete
> numbers, expressed as a single `mods` record so the rules live in one place.

| Patron | Playstyle | Boon (concrete) | Drawback (concrete) |
|---|---|---|---|
| **Cthulhu** | The idle patron | Follower devotion ×1.5 (they labour in dream) | Own chant ×0.75 |
| **Dagon** | The expansion patron | Spread range ×1.6, spread cost ×0.5 | Follower devotion ×0.9 |
| **Hastur** | The risk patron | Converts even committed rivals; the Veil pays **double** (madness slope 3 vs 1.5) | All deliberate sanity recovery ×0.5 |
| **Shub-Niggurath** | The rush patron | Chant ×1.5, follower devotion ×1.2 | Follower costs grow ×1.18/copy (vs ×1.15) |

Two **framing forces** (not playable, drive systems):
- **Azathoth** — the blind idiot god → source of **the Roil** (random strikes). *(Named
  "the Indifference" in early drafts; shipped as **the Roil** — Azathoth's blind, bubbling
  churn.)*
- **Nyarlathotep** — the Crawling Chaos → the **Tempter** (bargains).

---

## 7. Sanity vs. Power — the Veil (v2 ruleset)

A single per-player scalar, `sanity` in `[0,100]` (100 = Lucid, 0 = Unravelled).

v1 shipped this as pure downside plus a *free* "+12 sanity" button, which collapsed
the gamble (the spec's own #1 flagged risk). v2 makes both sides real:

- **The upside — the Veil:** ALL devotion gain (chant + followers) is multiplied by
  `1 + slope × (100 − sanity)/100`. Base slope 1.5 (×2.5 at zero sanity); Hastur's
  slope is 3 (×4). Madness *pays*, continuously, so delving is always tempting.
- **The downside — the toll:** below 40 sanity the flock bleeds (probabilistic
  devotion loss each tick, scaling with depth); below 25 whole **followers defect**;
  below 15 the patron's **lethal attention** can fall (~20% of the cell, rare).
  Hallucinated strikes remain (client-side dread, no state change).
- **Recovery is deliberate and costly — never free:**
  - **Rite of Lucidity:** +15 sanity for a **tithe of 8%** of the cell's devotion.
  - Tending wards (+1.5) and spreading the word (+1) — slow, lucid work.
  - Chanting no longer restores sanity (it was an invisible free regen).
  - All recovery is scaled by the patron's `sanityRestoreMul` (Hastur halves it).
- Bargains still lower sanity for power, and lower sanity draws stronger offers with
  worse hidden catches (§ Bargains): power and danger rise together.
- Design intent (unchanged, now actually enforced): *delve → gain → claw back toward
  lucidity → delve again*, as a genuine economic gamble rather than a reflex.

---

## 8. Rites (combat / eldritch powers) — reskin of missiles

Keep the 3-families × 3-tiers structure; reskin names and gate by sigil complexity.

| Family | Damage band (devotion removed from target) | Context |
|---|---|---|
| **Whisper** I/II/III | 300–700 | Initiate revelations / low High Priest |
| **Manifestation** I/II/III | 3,000–7,000 | High Priest |
| **Cataclysm** I/II/III | 30,000–70,000 | Top-tier High Priest |

- Tier (I/II/III) sets **range**: 500 km / 1,500 km / 5,000 km. Validate with
  **Haversine** distance between casting and target cells (keep existing logic).
- Damage rolled within band, subtracted from target cell devotion; "souls claimed"
  accrue to the caster (reskinned kill counter).
- **Soul harvest (v2):** 25% of the damage dealt returns to the caster's cell as
  devotion. v1 combat gave the attacker nothing, so rational players never cast;
  offence is now an investment, not a sink.
- Tier also sets **sigil complexity** (Section 4): Whisper = 1 stroke, Cataclysm =
  multi-stroke ornate.
- **Today: offence only** (as in prototype). Defences (wards/interceptors) are roadmap.

### Progression (High-Priest-only, upgrade-in-place)
Mirror the old click-milestone missile: a single rite upgrades as lifetime devotion
passes thresholds. Keep the existing threshold ladder, reskinned to Whisper → Manifestation
→ Cataclysm I/II/III.

---

## 9. World, spread & endgame

- **Cells** seeded from GeoNames (real coords/names/countries) → globe markers.
- Each cell tracks: current devotion, peak devotion, total lost ("the claimed"),
  contributor count, rite stockpile, `patron_id`, `sanity` aggregate.
- **Spread (social/PvP):** cells multiply city→city; compete by **converting** the
  uncommitted and undermining rivals — leaderboards for **Reach**, **Devotion**, **Lore
  uncovered**. Hastur faction can flip enemy cultists. (Geography moat preserved.)
- **The Roil:** a background worker fires random cataclysms across the map on a
  cosmic tick; ritual/wards lower per-cell odds *and* blunt damage, but never to zero, and
  wards erode unless tended. Broadcast `roil_strike`. Telegraph so it reads as fate, not
  unfairness.
- **The Awakening (endgame / seasons):** when an alignment condition is met, the first
  cult to complete the **Great Rite** wakes its patron → **server-wide event** → world
  reseeds, new cycle. This is the season loop and the reason to push past safe play.

---

## 10. Realtime events (WebSocket)

Reskin existing event names; add new ones.

- `chant` (client→server): increment devotion (rate-limited).
- `rite_invoke` (client→server): `{rite_id, target_cell_id}` after local sigil match.
- `cell_update` (broadcast): devotion deltas.
- `rite_strike` (broadcast): a rite landed on a cell.
- `rite_incoming` (broadcast to target): telegraph.
- `bargain_offer` (server→client): Nyarlathotep proposes a pact.
- `roil_strike` (broadcast): random cosmic cataclysm (the Roil); carries a `warded` flag.
- `sanity_update` (server→client): meter changes + any hallucination flags.
- `awakening_progress` / `awakening_triggered` (broadcast): endgame.

---

## 11. Data model sketch (SQLite, evolve via migration)

```
users        : id (uuid), patron_id, sanity, total_chants, best_10s, best_1day,
               last_cumulative_threshold, rite_tier, subscription_*  (keep old fields, rename)
cells        : id, geonames_id, name, country, lat, lon, devotion, peak_devotion,
               claimed, contributor_count, patron_id, ward_level
cell_snapshots : cell_id, day, devotion          (keep snapshot worker)
bargains     : id, user_id, kind, power_grant, sanity_cost, hidden_catch, state, expires_at
events_log   : optional append-only for strikes/awakening (analytics)
```

Revelations (achievements) remain **computed**, not stored — derived from user counters,
exactly as the prototype derives achievements. Adapt thresholds; no new tables.

---

## 12. Monetization

- **Subscription** upgrades Initiate → **High Priest** (weekly/monthly): 2× devotion,
  ornate sigil tiers, forbidden tomes, faster rites. +20% early-renewal bonus.
- **Cosmetics** (no power): sigil styles, robes, eldritch globe FX.
- Bill via **Stripe** (PWA) — keep the ~30% app-store cut.
- Plan the business on **2–5% free→paid** conversion (genre standard). Selling "cling to
  lucidity" sanity-restores is fair and thematic; **never** sell the only way to survive.

---

## 13. Tone & art direction

- **Eerie-atmospheric** core (dread, hushed reverence — the *Cultist Simulator* register),
  with wit at the edges. **Never camp.** Commit to one register.
- Palette: abyssal void, eldritch teal, sickly gold, madness crimson.
- The 3D globe is the signature image: cult cells glowing, sigils tracing in light,
  cataclysm rippling across continents.

---

## 14. Guardrails (must-dos)

- **IP:** core Mythos is public domain (Lovecraft, d. 1937), but **clear specific names**
  against trademarked properties (Chaosium's *Call of Cthulhu*, FFG's *Arkham* line,
  modern-author additions) before shipping any term. Stay on Lovecraft's own canon.
- **Ethics:** Lovecraft was deeply racist and some original names/text carry it. Build on
  the cosmic-horror **structure**; rename tainted elements; do not inherit the source
  uncritically.
- **Occult sensitivity:** far milder than real religion, but keep "cult" pulpy and
  cosmic — never evoke real-world cult tragedies.

---

## 15. Suggested build phases (sequence for the coding agent)

1. **Reskin pass (low risk):** rename population→devotion, click→chant, missile→rite,
   city→cell, tiers; update copy, palette, leaderboards. Ship the existing game in new
   clothes. No mechanic changes.
2. **Sigil input:** add `$P` stroke recogniser; gate Rites behind sigil draw; tier→stroke
   complexity. Keep chant as baseline.
3. **Patrons:** add `patron_id`, selection flow, asymmetric boons.
4. **Sanity/Power + Bargains:** add meter, Nyarlathotep `bargain_offer` loop,
   low-sanity risk effects + hallucinations. **Prototype balance here first.**
5. **The Roil:** cosmic-tick worker + `roil_strike` + per-cell wards. ✅ *(done in UI-first build)*
6. **Spread/conversion + Awakening:** conversion mechanics, Reach/Lore leaderboards,
   Great Rite endgame + season reseed. ✅ *(done in UI-first build)*
7. **PWA + Stripe:** installable shell, web push, subscription billing & downgrade.

---

## 16. Open questions to resolve early

- **Sanity balance:** how steep is the power curve vs. the punishment curve so the
  delve/recover loop stays a real gamble? (Highest-risk unknown.)
- **World density:** how to keep cells populated enough for PvP to feel alive at low CCU
  (seed bots? concentrate players? regional servers?).
- **Sigil set:** how many distinct sigils, and do they map 1:1 to rites or compose?
- **Conversion vs. damage:** is "convert rival cultists" the primary PvP verb, with rites
  as the aggressive minority? (Recommended, to stay non-toxic and on-theme.)
- **Tone lock:** atmospheric vs. comic — decide before art.

---

## 17. v2 re-evaluation — the Liturgy update

A full design pass over the shipped UI-first build, against the question: *would this
succeed as a game?* Verdict: the theme, globe spectacle, sigil input, hidden-catch
bargains, and season loop are strong; the **core economy was broken** in four ways,
each fixed in v2.

### What was broken, and the fix

1. **No growth curve.** A chant was +1 forever, in a world seeded with cells holding
   hundreds of thousands. The genre's heartbeat — buy generators, watch numbers
   compound — was absent; the core verb was statistically meaningless within a minute.
   **Fix: the Liturgy.** Devotion is spendable. **Followers** are generators
   (Whisperer 50→1/s up to Black Library 1.2M→6,400/s; cost ×1.15 per copy) and
   **Litanies** are chant doublers (6 ranks, 300 → 30M). The world reseeds smaller
   (≈400–72k per cell) so a session of play visibly climbs the boards.
2. **Sanity wasn't a gamble.** High sanity had no opportunity cost, low sanity no
   upside outside bargains, and the free +12 lucidity button pinned the meter.
   **Fix: the Veil** (§7) — madness multiplies all income; tolls, defections, and
   lethal attention bleed it back; lucidity costs an 8% tithe.
3. **Combat was unmotivated.** Rites cost sanity and granted a vanity counter.
   **Fix: soul harvest** (§8) — 25% of damage feeds the caster's cell.
4. **Patrons were skins.** Only Hastur had a mechanic. **Fix:** every patron is a
   playstyle with concrete multipliers (§6), chosen with honest copy at onboarding.

### Supporting changes

- **Bargains scale with the player** — grants and hidden catches are fractions of the
  home cell's devotion, so the Tempter stings identically at 5k and 500k. (They were
  flat numbers: absurdly generous early, irrelevant late.)
- **The cult endures the Awakening** — followers and litanies persist when the world
  reseeds, making the season loop a light prestige system: each cycle restarts the map,
  not the player's engine.
- **Great Work goal** retuned to 1.2M for the smaller world; Roil and bot strike
  damage rescaled to match.
- **High Priest** keeps 2× chant and gains ×1.5 follower output, so the subscription
  matters in the idle half of the game too.

### Characters (reviewed, kept)

The roster stands: four playable patrons (Cthulhu, Dagon, Hastur, Shub-Niggurath — all
Lovecraft's own canon, public domain) plus the two framing forces (Azathoth → the Roil,
Nyarlathotep → the Tempter). The cast needed mechanical teeth, not replacement; the
asymmetry above gives each a reason to be chosen.

---

*Companion documents (design rationale, market context): the FHTAGN lore & systems bible
and the Global Conflict market-research deck.*
