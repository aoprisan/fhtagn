# FHTAGN

> *"Ph'nglui mglw'nafh Cthulhu R'lyeh wgah'nagl fhtagn."* — the stars are right.

A real-time, multiplayer **cult clicker on a 3D globe**. Found a cult cell in a real city,
chant to gather **devotion**, trace **sigils** to invoke eldritch **rites**, court forbidden
power against your **sanity**, and race rival cults to wake a sleeping god — while the
indifferent cosmos strikes at random.

See [`FHTAGN_Game_Spec.md`](./FHTAGN_Game_Spec.md) for the full design.

## Status — UI-first

This is the **UI-first** build: the entire game runs in the browser against an in-browser
simulation (`web/src/client/MockGameClient.ts`) — **no backend required**. It deploys as a
static site to GitHub Pages so the feel can be tested quickly. A Go backend will replace the
mock later behind the same `GameClient` seam (`web/src/client/`).

What's in it:
- **Reskin** of the prototype: devotion, chant, rite, cell, patrons, tiers (Witness / Initiate /
  High Priest), the Pact.
- **The Liturgy** (v2 — see spec §17 for the full re-evaluation) — devotion is a *currency*:
  buy **followers** (devotion per second, exponential costs) and **litanies** (each doubles the
  chant). The growth engine the clicker genre demands; followers persist when the world reseeds,
  so each cycle is a light prestige. Patrons are now real playstyles, not flavor: Cthulhu (idle:
  followers ×1.5, chant ×0.75), Dagon (expansion: spread 60% further at half cost), Hastur (risk:
  flips the committed, madness pays double, mind mends at half pace), Shub-Niggurath (rush:
  chant ×1.5, followers ×1.2, costs climb faster).
- **Living world** — ~170 real cities seeded as cult cells; bots chant, rites streak, and
  **the Roil** (Azathoth's blind churn) falls at random. Cells raise **wards** that lower
  their odds of being struck and blunt the blow — but never to zero, and wards erode unless
  tended. State persists in `localStorage`.
- **Sigil input** — rites are invoked by *tracing a sigil* (a `$P` point-cloud recogniser);
  tier sets stroke complexity. A faltered sigil costs nothing.
- **Sanity / the Veil** — a genuine delve/recover gamble: *all* devotion gain multiplies as the
  mind frays (×2.5 at zero sanity; ×4 for Hastur), but below 40 the flock bleeds, below 25
  followers defect, and at the brink your patron's lethal attention falls. Hallucinated strikes
  blur what's real. Clawing back is never free: the Rite of Lucidity tithes 8% of your cell's
  devotion. Rites themselves harvest souls — 25% of the damage feeds your own cell.
- **Bargains** — Nyarlathotep, the Tempter, offers pacts (more often as your mind frays). The
  grant and the sanity cost are shown; the **catch is hidden** and springs probabilistically
  later — a strike, a defection, a false calm. A genuine gamble, not a known trade. Call him
  yourself with *Court the Tempter*, or wait to be courted.
- **Spread & the Awakening** — carry the word city→city with *Spread the Word*: convert the
  uncommitted, or flip a rival you overpower (Hastur flips anyone). Spread widens your **Reach**
  and uncovers **Lore** — three leaderboards now rank Devotion, Reach, and Lore. As cults amass
  their **Great Work**, the **Convergence** climbs; when the stars are right, the first cult to
  perform the **Great Rite** wakes its god, the world reseeds, and a new **Cycle** begins. Dawdle
  and a rival wakes theirs first — the reason to push past safe play.

## Develop

```bash
cd web
npm install
npm run dev          # http://localhost:5173
npm run build        # tsc + vite build → web/dist
npm run preview      # serve the production build
```

## Deploy

Pushing to `main` runs `.github/workflows/deploy.yml`, which builds `web/` and publishes to
GitHub Pages. The site is served under `/<repo>/` — the base path is set in `web/vite.config.ts`
(`/fhtagn/`); change it for a different repo name or a custom domain.

## Architecture seam

All world interaction goes through the `GameClient` interface (`web/src/client/GameClient.ts`).
Today `MockGameClient` implements it. When the backend lands, a `LiveGameClient` wrapping
`fetch` + WebSocket implements the same interface and `web/src/client/index.ts` selects it — the
UI does not change.
