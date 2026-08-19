# LBO Simulator

An interactive leveraged buyout model. Move a lever — entry multiple, leverage,
growth — and watch the return and the risk move with it, live.

Built to two standards: the numbers must match a hand-built Excel model
exactly, and the mechanics must be visible, not just the outputs.

## Stack

- **Vite + React + TypeScript** (strict mode)
- **Tailwind CSS** for layout; the entire palette lives as CSS variables in
  `src/index.css`
- **Zustand** for the deal-input state
- **Vitest** for tests
- Charts are hand-built SVG components — no charting library, so the visual
  language stays consistent with the rest of the app and the bundle stays
  small
- No backend: the entire deal state is compressed into the URL
  (`lz-string`, URI-safe encoding) — a link *is* the case
- Deployed on Vercel

## Project structure

```
src/
  model/        pure calculation logic — no React imports, no side effects.
                Runs unchanged in a plain Node script. This is the part
                that has to be exactly right.
  state/        Zustand store, URL state codec
  ui/           components: controls, charts, panels
  pages/        top-level views (Essentials mode, Methodology)
  i18n/         all user-visible text (English; structured so a German
                translation can be added without touching components)
```

**Hard rule:** nothing under `src/model/` imports from React or touches the
DOM.

## Running it

```bash
npm install
npm run dev      # local dev server
npm run test     # run the test suite once
npm run test:watch
npm run build    # production build
```

## Methodology

The in-app "Methodology" link explains how every number is calculated —
Sources & Uses, the interest/debt circularity and how it's solved, the cash
sweep waterfall, IRR by bisection, and the value creation bridge — along
with the simplifications this version makes and why.

## Status

See `CHANGELOG.md` for what's built and what's still open. This is a
milestone-based build; each milestone is a working, deployed version of the
tool with an expanding feature set.
