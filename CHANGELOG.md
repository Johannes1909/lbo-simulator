# Changelog

## Post-Milestone-1 additions, pre-deployment (2026-08-18)

### Design pass: light mode as default

- Default appearance switched to a printed-investment-memo look: broken-white
  ground, pure-white surfaces, very dark blue text instead of black, brass as
  the single accent, steel blue for debt, red reserved for warnings. Dark
  mode kept as an explicit toggle (top-right), remembered in `localStorage`,
  deliberately not part of the shareable deal state.
- Boxed panels (Tombstone, Sources & Uses) replaced with hairline rules,
  consistent with the "printed memo, not developer tool" brief.
- Negative numbers now render in parentheses everywhere (IRR, growth rates,
  bridge deltas), not just currency figures.
- Every text/background color pair checked against the WCAG contrast formula
  (not eyeballed): body text ≥4.5:1 in both themes; hairlines are
  intentionally lower-contrast (~1.8–2.7:1) since they're decorative
  dividers, not text. Caught and fixed one real issue: the lighter brass
  tone was only 3.2:1 on white and has been restricted to decorative/fill
  use (chart points, focus ring); all brass *text* uses the darker tone.

### Bug fix: inconsistent EBITDA basis for "× EBITDA" debt sizing

- Found by the sponsor via a hand-check of the default case. A tranche sized
  as "× EBITDA" was scaled against the operating model's own year-0 EBITDA
  (revenue × margin), not the transaction's displayed LTM EBITDA input — the
  two can legitimately differ, and the app default case had them differ
  (25.0 vs 22.0), producing debt 13.5 lower than a reader would compute by
  hand from the number on screen.
- Fixed by adding `debtSizingEbitda()`: when the deal is valued on an EBITDA
  basis, debt sizing now uses the exact same figure as the displayed LTM
  EBITDA; falls back to the operating model's EBITDA only when the deal is
  valued on a revenue basis (no EBITDA transaction input to anchor on).
- Added a regression test (`sourcesUsesInvariant.test.ts`) built from the
  exact input values that were live when the bug was found — confirmed
  failing before the fix (99.0 vs the correct 112.5), passing after.
- Sources & Uses is now its own visible panel (Uses/Sources line items,
  including transaction costs and minimum cash funded) rather than folded
  silently into the "equity invested" figure.
- App defaults changed to the sponsor's hand-verified reference case itself
  (EBITDA 40, entry 9.0x, 5-year hold, exit 9.0x) — opening the app now
  shows 20.2% IRR / 2.51x directly, which doubles as a standing acceptance
  check.
- Four sliders added to the calculator (tax rate, D&A %, capex %, working
  capital %) so the full reference case is reproducible from the UI alone —
  bringing Essentials to 14 sliders, above the ~8–10 originally targeted;
  flagged as a candidate to redistribute once Full Model (Milestone 3)
  exists.

### Site navigation and /learn scaffold

- Added a site-wide nav bar (`Calculator | Saved | How it works |
  Methodology`) driven by a one-line-per-entry config
  (`src/nav/navConfig.ts`). Active entry highlighted, collapses to a mobile
  dropdown menu, calculator stays the homepage at `/`.
- Added a minimal client-side router (`src/state/routeStore.ts`, a Zustand
  store rather than a new dependency — four static paths don't justify a
  routing library) with working browser back/forward and deep links.
  `vercel.json` added with a catch-all rewrite so `/learn`, `/methodology`,
  `/saved` don't 404 on refresh once deployed.
- `/methodology` converted from an overlay modal into a real page; now
  cross-links with `/learn` in both directions.
- `/learn` built as a scaffold: six sections, table of contents with jump
  links, continuous reading flow, readable at 380px. Content lives in
  `src/content/learn.ts` as structured data (paragraphs + optional
  glossary), separate from layout.
- Three reusable, model-driven building blocks added under `src/ui/learn/`:
  `ComparisonTable` (N cases side by side, any of a fixed metric set),
  `SimpleBarChart` (2–4 values), `GlossaryList`. All three call `runModel()`
  at render time — no number in any of them is stored.
- `/saved` added as a routed stub; full functionality is Part B.

### /learn content filled in

- All six sections' text supplied by the sponsor and reproduced verbatim —
  no rewriting, no invented placeholder prose.
- Every `{placeholder}` in the supplied text resolved against `runModel()`
  output at render time (entry EBITDA, entry multiple, enterprise value,
  hold period, year-1 interest and its tax shield, and the three value
  bridge components) — confirmed by an automated check that no unresolved
  `{token}` reaches the rendered page.
- Three live comparisons wired in as specified: the leverage effect (same
  default case at 0% vs 55% debt — a table plus a two-bar IRR chart), a
  stress case (same case at −8% revenue growth, 30% vs 55% debt), and exit
  timing (same case exited in year 3 vs year 6). `ComparisonTable` extended
  with the additional metric keys these needed (EBITDA at exit, net debt at
  exit, net debt/EBITDA) and now surfaces each case's model warnings
  automatically below the table when present.
- Glossary filled with the fourteen supplied terms, alphabetical.
- One open question raised in chat: the risk-scenario paragraph describes
  equity being "wiped out entirely" at the higher leverage level, but the
  wired −8%-growth / 55%-debt case currently lands at a diminished-but-
  still-positive equity value (101.9), not zero — the paragraph makes a
  general point rather than being tied to this exact figure, but flagging
  it since the text and the live table sit right next to each other.

### Still open before Part B

Part B (save/name/reopen calculations, `/saved` page, export/import) not
started yet — proceeding on the sponsor's go-ahead.

## Typed number entry on every slider (2026-08-19)

### Built

- Every slider's value display is now an editable field, not just a label:
  click or Tab in selects the current value so typing replaces it; Enter or
  blur commits; Escape discards the edit; comma or period both work as the
  decimal separator; ArrowUp/ArrowDown nudge by one step, Shift by ten
  steps; `inputmode="decimal"` requests the numeric keypad on mobile.
  Nothing is reformatted while typing — formatting is applied only on
  commit.
- Out-of-range typed input clamps to the nearest bound and shows a calm,
  auto-dismissing hint under the field (no red border, no dialog); invalid
  input (letters, empty) silently reverts to the previous value with no
  message at all, per spec.
- The typed range is deliberately wider than the slider's drag range — e.g.
  debt is draggable 0–7x but typeable to 12x, specifically so the model can
  be pushed past what any lender would finance and be watched break. A
  typed value beyond the slider's own bounds pins the slider thumb at
  whichever end it's nearest to; the field keeps showing the real number.
- All fourteen parameter ranges (slider range, typed range, step,
  integer-only) now live in one file, `src/ui/controls/paramRanges.ts` —
  the slider, the text field and the clamping logic all read from the same
  definition, so they cannot drift apart. A new parameter is one entry.
- Added `@testing-library/react`, `@testing-library/user-event` and
  `@testing-library/jest-dom` (new dependency — justified: hand-rolling
  focus/keyboard/blur interaction simulation would be far more than the
  "30 lines" bar for skipping a library) and 11 interaction tests covering
  every behavior above, including that a typed value beyond the slider's
  range still shows correctly on both the field and the pinned slider.

### Bug found and fixed while testing this: chart crash under extreme leverage

- Typing 12x debt (now reachable, previously not) revealed that
  `ValueSplitChart` computed a negative `<rect>` height whenever net debt
  exceeded enterprise value — i.e. exactly the underwater-company case this
  typed-range feature exists to let you see. Root cause: the chart's
  vertical scale was sized to enterprise value only, never to net debt.
  Fixed by scaling to whichever is larger at each point, and by clamping
  the equity segment's height at zero as a second line of defense. Verified
  in-browser at 12x leverage: no console errors, the chart now visibly
  shows the debt bar overtaking the equity bar, and the app correctly
  displays "Sponsor equity investment is zero or negative" rather than a
  broken render.
- No other chart had this defect (`DeleveragingChart` and `ValueBridgeChart`
  were already either scale-safe by construction or explicitly clamped).

All 44 tests green (33 model/state + 11 new UI interaction tests),
reference case still 20.20% / 2.509x.

### Built

- Project scaffolded: Vite + React + TypeScript (strict mode), Tailwind CSS
  with the full palette as CSS variables, Zustand, Vitest, `lz-string` for
  URL state.
- Model layer (`src/model/`), pure functions, no React:
  - `types.ts` — shared types, including forward-looking types for the
    sweet-equity/ratchet structure (Milestone 3) so they won't need
    reshaping later, per sponsor brief.
  - `sourcesUses.ts` — Sources & Uses, tranche sizing (absolute or × EBITDA).
  - `operating.ts` — revenue/EBITDA/D&A/capex/working-capital build.
  - `debt.ts` — single-tranche debt schedule with scheduled amortization,
    100%-configurable cash sweep, and the interest/debt circularity solved
    by iteration (switchable to a no-circularity prior-year-end basis).
  - `returns.ts` — IRR by bisection (−99% to +1000%, tolerance 1e-7, no
    closed-form shortcut), money multiple.
  - `analytics.ts` — value creation bridge (EBITDA growth / multiple change
    / deleveraging & other), reconciles to the exact equity difference by
    construction.
  - `engine.ts` — orchestrates the above into `runModel(inputs)`.
- Reference Case 1 (hand-calculated and supplied by the sponsor, verified
  independently) passes exactly: Sources & Uses, all five years of the P&L
  and debt schedule, exit equity, IRR (20.2%), money multiple (2.509x), and
  the value bridge.
- Additional test coverage: IRR against known cash flow series (single- and
  multi-sign-change, no-solution cases), Sources = Uses across varied
  inputs, value bridge reconciliation across varied inputs (not just the
  reference case), boundary cases (0% leverage, 100% leverage, negative
  growth, 1-year hold, debt-never-negative under an aggressive sweep,
  minimum cash respected), circularity convergence (both a normal
  converging case and a deliberately iteration-starved case that reports a
  warning instead of a number), URL state round-trip.
- Essentials UI: sticky top result bar (IRR, multiple, entry/exit leverage,
  a covenant status placeholder), the brass-framed Tombstone, ten sliders
  across Transaction / Financing / Operating / Exit, three hand-built SVG
  charts (deleveraging, enterprise value split, value creation bridge),
  a plain-text warnings panel, a Methodology page, a copy-link button.
  Verified in a real browser: reactive updates, chart rendering, URL hash
  sync, usable down to 380px width, keyboard focus visible.
- Deal state lives entirely in the URL (hash fragment, `lz-string`
  URI-safe encoding); loading a link reconstructs the exact case.

### Decisions taken this milestone (see chat for full sponsor rationale)

- Number format: US/international (1,234.56), not European — the UI
  targets an international audience.
- NOL carryforward: unlimited/uncapped in Milestone 1; a realistic cap
  arrives later.
- No stub periods yet — closing is always the start of a full year.
- Seller notes count toward net debt for all leverage/covenant metrics.
- Interest is computed on the full-precision balance and only rounded for
  display — rounding at each intermediate step produces numbers that drift
  from a hand-built Excel model by the third or fourth year.

### Known simplifications, documented in the Methodology page

- No revolving credit line yet (Milestone 2). If cash flow can't cover
  scheduled debt service, the model lets cash fall below the minimum (or
  negative) and reports it as a warning rather than fabricating a facility
  draw.
- Transaction costs are absorbed into the "deleveraging & other" bucket of
  the value bridge rather than shown as their own line — flagged as a
  candidate to split out if the sponsor wants that granularity later.
- One tranche, fixed rate, cash-pay only. PIK, floating rates,
  multi-tranche seniority waterfall: Milestone 2.

### Open points for the sponsor

- Confirm the `lz-string` URI-safe encoding (rather than a literal
  base64url pass) is an acceptable reading of "lz-string, base64url" from
  the brief — functionally equivalent (compact, URL-safe, no escaping
  needed) but not byte-identical to standard base64url.
- Not yet deployed to Vercel / pushed to GitHub, per instruction — sponsor
  will connect the repo (`lbo-simulator`) and Vercel once this milestone is
  reviewed.

### Not started yet (later milestones)

Multi-tranche capital structure, PIK, revolver, covenants (Milestone 2);
full income statement/cash flow tables, per-year override tables,
working-capital days, dividend recap, management rollover/sweet
equity/ratchet wiring into the engine (Milestone 3); sensitivity analysis,
goal seek, scenario management, click-to-derive (Milestone 4); presentation
mode, Excel/PDF export (Milestone 5).
