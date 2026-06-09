# FHTAGN — Feature Brainstorm

A grounded brainstorm building on what already ships in the UI-first build (chant,
sigil-traced rites, sanity/power, bargains with hidden catches, the Roil + wards,
patrons, spread/Reach/Lore, the Convergence → Great Rite → cycle reseed). Ideas are
grouped by system, with a rough cut at the end: what fits the current
`MockGameClient` build vs. what wants the Go backend.

Where an idea answers an open question from the spec (§16), it's flagged.

---

## 1. Sanity & madness — give the gamble a bottom and a texture

- **Madness traits (roguelite quirks).** Crossing sanity thresholds on the way down
  imprints a semi-permanent trait until you claw back lucidity: *Glossolalia*
  (chants occasionally double, but all UI text subtly garbles), *Paranoia* (more
  hallucinated strikes, but +ward efficiency — your fear is useful), *Night Terrors*
  (idle gains pause, rite damage up). Makes "how low do I go" a build choice, not
  just a meter.
- **Unravelling, not death.** At sanity 0 you don't lose — you become a **Vessel**:
  a short, terrifying power state (huge multipliers, no control over targeting —
  the patron casts *through* you), followed by forced rebirth with a progress tithe.
  The gamble finally has a real bottom that players will both fear and chase.
- **Consensus madness.** Low-sanity players see *each other's* hallucinated strikes.
  Two unravelling cultists in the same cell start confirming each other's phantoms —
  pure client-side dread, socially amplified, zero state change.
- **Communal lucidity rites.** Cellmates can chant *over* a frayed cultist to restore
  their sanity faster than solo recovery. Cheap, thematic co-op pull; gives healthy
  players something to do for the delvers they depend on.

## 2. Sigils — depth on the signature verb *(answers §16 "do sigils compose?")*

- **Sigil grammar.** Rites are composed from a small alphabet of base glyphs
  (stroke primitives the `$P` recogniser already handles). Lore doesn't just score —
  it reveals grammar fragments, so uncovering Lore literally teaches you new
  combinations. Discovery becomes the Lore leaderboard's *point*.
- **Witnessed sigils (espionage by observation).** When a rival's rite lands near
  you, its sigil briefly flares on the globe. You may *attempt to copy it* — trace
  what you saw, no guide, one try. Success steals a rite you haven't earned;
  failure costs nothing but the chance. Skill-based theft, very on-theme.
- **Counter-sigils (active defence).** The `rite_incoming` telegraph opens a short
  window for any defender in the target cell to trace a counter-sigil and blunt the
  strike. Wards stay the passive layer; this is the skill layer. Turns being
  attacked into a moment instead of a toast.
- **Sigil mastery.** Track per-sigil trace cleanliness; consistently clean traces
  earn a small crit/discount on that rite. Buffs only — a faltered sigil still
  costs nothing (keeps the spec's "fail gracefully" rule intact).

## 3. The Roil & the living world — shared weather, shared moments
*(answers §16 "world density at low CCU")*

- **Roilstorms.** Some Roil events become moving *fronts* instead of point strikes —
  visible churn crawling across the globe over minutes. Every cell in the path
  scrambles to tend wards at once. Creates regional "we all remember that storm"
  moments and makes the globe view appointment viewing.
- **Alignments ("the stars are right" hours).** Scheduled celestial windows where
  rites are cheaper/stronger and Convergence climbs faster. Concentrates a sparse
  player base into the same hour — temporal density instead of geographic density.
- **Ley lines.** Faint lines drawn between cells; cells on a shared line resonate
  (ward or devotion bonus), and holding an entire line grants a boon. Adds map
  strategy beyond Haversine range — suddenly *which* cities you spread to matters.
- **The Dream layer.** A toggleable second globe (the Dreamlands) — inverted
  palette, same cities. Cthulhu cultists act there while idle; gains made in dream
  manifest in the waking world on a delay. Doubles as the patron's identity
  mechanic ("passive accrual while idle") made *visible* instead of a hidden rate.

## 4. Nyarlathotep — make the Tempter a character, not a dialog box

- **He remembers.** Refusals are tracked too. Decline often and offers get rarer
  but richer; accept greedily and catches get crueler. A per-player relationship
  curve, all server-side numbers, reads as personality.
- **Bargain chains.** Some pacts unlock darker follow-ups ("you took the Whisper;
  he offers the Mouth"). Three-deep chains with the final catch landing on the
  *first* pact's terms — players reconstruct the trap in hindsight.
- **Pass the catch.** Spend devotion to push your hidden catch onto a rival cell
  before it springs. You don't know what you're passing — neither do they. Cruel,
  cheap to build (catch already exists as deferred state), extremely Nyarlathotep.
- **The Auction of Masks.** A rare server-wide event: one unique artifact, blind
  bids in devotion, every cult sees the auction but not the bids. The loser's bid
  is *still spent* ("he keeps what is offered"). A devotion sink with drama.

## 5. Social & PvP — conversion as the primary verb *(answers §16 "conversion vs. damage")*

- **Covens.** 3–8 players inside a cell form a coven; chanting *simultaneously*
  (within a rolling window) earns a resonance multiplier. Real-time togetherness
  that the WebSocket layer makes trivial to detect, and the chant button finally
  has a social reason to be pressed at 9pm with friends.
- **Schism.** A cell whose contributors back different patrons can fracture — a
  contested cell splits into two markers at the same city, feuding. Internal
  politics as content; Hastur players will engineer schisms deliberately.
- **The Whisper Network.** An in-world anonymous rumor feed: Roil forecasts, rival
  movements, Convergence rumors. Some rumors are true (server-seeded), some are
  *hallucinations injected by low-sanity players' clients*. Information warfare
  where sanity determines whether you can trust your own intel.
- **Pilgrimage.** Spreading to a far cell can be done instantly (current Spread) or
  by sending a *pilgrim* who visibly travels the globe over real minutes for a much
  stronger founding. Pilgrims can be struck by the Roil in transit. Makes the globe
  a board, not a backdrop.

## 6. Endgame & cycles — make history accumulate

- **Cycle scars.** When a god wakes and the world reseeds, the event leaves
  permanent marks: a drowned city where R'lyeh rose, a yellow stain over the
  winning cult's seat, legacy titles ("Voice of Cycle III"). Veterans can point at
  the globe and tell the story; new players see a world with a past.
- **Interrupted Awakening.** The Great Rite takes time and is *visible globally*
  while channeled — rival cults get one last chance to break it (counter-sigils,
  rite barrages). If broken, the spurned patron lashes its **own** cult. The endgame
  becomes a raid moment with real defenders, not a progress bar completing.
- **The woken god shapes the next cycle.** If Cthulhu woke, coasts are richer next
  cycle; if Hastur, global sanity decays faster; if Shub-Niggurath, spread is wilder.
  Each season plays differently and the *previous winner* authored why.

## 7. Retention & PWA hooks (already planned infrastructure, themed hard)

- **The Vigil.** Offline progression reported on return as a vigil log — "while you
  slept, the cell chanted; the Roil passed two wards to the north." Same idle math,
  but narrated, so returning feels like rejoining a world rather than collecting.
- **Dread push notifications.** Web push (already on the PWA roadmap) written as
  omens: "Something stirs near Marseille." Strict budget — one a day, only for
  *true* events (your cell struck, Convergence threshold, Alignment starting).
- **Daily Omen.** One free divination per day reveals a true fact about world state
  (your cell's current Roil odds, a rival's Reach). Pairs with the Whisper Network:
  the Omen is the only intel you can fully trust.

## 8. Monetization-adjacent (cosmetic-only, per spec §12)

- Sigil **trail styles** (ink, ichor, starlight) — the trace is the most-seen
  animation in the game; skin it.
- **Cell architecture** skins for the ziggurat viz; patron-themed globe weather.
- **Tome of the Cycle**: end-of-season cosmetic recap pass — titles, trails, scars
  highlighted on *your* contribution. No power, ever, consistent with "never sell
  the only way to survive."

---

## Rough cut: where each idea can land

**Fits the current UI-first build (MockGameClient, client-side state):**
madness traits, Vessel state, consensus madness, sigil mastery, counter-sigils,
witnessed sigils, Roilstorms, Alignments, ley lines, Tempter memory, bargain
chains, cycle scars, Daily Omen, Vigil log, all cosmetics.

**Wants the real backend (shared truth / anti-cheat / simultaneity):**
covens (simultaneous-chant detection), schism, Whisper Network injection,
pilgrimage, Auction of Masks, interrupted Awakening with live defenders,
cross-cycle world shaping, push notifications.

**Suggested next three to prototype** (highest feel-per-effort, all mock-buildable):

1. **Counter-sigils** — completes the attack/defend loop using the input system
   that already exists; being struck becomes gameplay.
2. **Madness traits + Vessel** — directly attacks the spec's #1 flagged risk
   ("sanity must be a genuine gamble"): traits make descent interesting, the
   Vessel gives it a bottom worth fearing.
3. **Alignments** — cheapest possible fix for world-density-at-low-CCU, and it
   *is* the tagline: the stars are right.
