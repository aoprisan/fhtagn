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
- **Living world** — ~170 real cities seeded as cult cells; bots chant, rites streak, the
  Indifference strikes. State persists in `localStorage`.
- **Sigil input** — rites are invoked by *tracing a sigil* (a `$P` point-cloud recogniser);
  tier sets stroke complexity. A faltered sigil costs nothing.
- **Sanity / Power** — a delve/recover gamble: accept power to lose sanity and unlock stronger
  rites; low sanity brings hallucinated strikes. (Prototype balance — not yet tuned.)

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
