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

## Milestone 2 — Capital structure (2026-08-20)

Reference Case 1 (single tranche, 100% sweep, interest on prior-year-end
balance) passes unchanged and unedited — the model layer was extended, not
rewritten; the single-tranche case is now the N=1 special case of the
general waterfall. All 44 Milestone-1-era tests pass without modification.
14 new capital-structure tests added, all green: 58 total.

### Model (`src/model/`)

- **Types**: every new field on `DebtTranche`, `DealInputs`, `SourcesUses`
  etc. is optional with an engine-level default — this is what let the old
  test fixtures keep compiling and producing identical numbers untouched.
- **`debt.ts`** rewritten for N tranches: seniority-ranked waterfall (cash
  interest → PIK capitalization → commitment fee → scheduled amortization
  by rank → revolver draw on shortfall → revolver repay-first on excess →
  cash sweep by rank and participation), a real revolver (committed vs.
  drawn, draws automatically, repays before any other sweep, commitment fee
  on the undrawn portion only, a shortfall beyond its capacity is reported
  not absorbed), floating rates (deal-wide reference curve + per-tranche
  margin and optional floor), and cash/PIK splitting by a per-tranche %.
  Both interest-basis conventions (prior-year-end, average-balance with
  iteration) carried over unchanged.
- **`sourcesUses.ts`** extended: itemized transaction costs (any mix of %-
  of-EV and absolute), per-tranche arrangement fees, a revolver's committed
  limit correctly excluded from Sources (only what's drawn at close
  counts), management rollover, and a designable "plug tranche" for when
  sponsor equity is fixed instead — solved as an exact fixed point so an
  arrangement fee on the plug tranche itself doesn't throw off the balance.
- **`covenants.ts`** (new): net debt/EBITDA, senior debt/EBITDA (rank
  threshold configurable), interest coverage (cash interest only — PIK
  isn't a cash claim), debt service coverage, free cash flow yield. Each
  covenant has its own enable switch, threshold, headroom %, and a
  plain-sentence message ("Interest coverage 1.8× is 10% below the limit
  of 2.0×.") generated whether or not it's breached.
- Defaults (`defaults.ts`) now build the sponsor's specified European
  mid-market structure (TLA/TLB/revolver/mezzanine/unused seller note) —
  see "Open point" below on what this does to the Milestone-1 acceptance
  check.

### UI

- Full Model mode (toggle next to Essentials, state shared — switching
  never resets the deal) with three tabs: **Capital structure** (itemized
  Sources & Uses with a live balance check, an add/duplicate/remove/expand
  tranche table covering every field above, the reference rate curve with
  per-year overrides), **Debt schedule** (per-tranche year-by-year table,
  total debt roll-forward, credit metrics with covenant headroom and
  breach messages), **Operating** (the four sliders that moved out of
  Essentials, plus a per-year one-off-cost table — see open point below).
- Essentials' "Debt (× EBITDA)" slider now scales every tranche
  proportionally (by funded amount, so it stays consistent with what
  Sources & Uses displays — an undrawn revolver's committed size doesn't
  inflate the figure) rather than editing a single tranche.
- Deleveraging chart now stacks by tranche, five shades of the steel-blue
  debt color assigned by seniority rank (cycling if there are more than
  five tranches), legend below listing every tranche by name.
- Bug found and fixed while browser-testing the new charts: at very high
  leverage (reachable now that debt tranches can be resized arbitrarily),
  net debt can exceed enterprise value, which the value-split chart's
  y-scale didn't account for — same class of fix as the equity-split chart
  bug from the typed-input milestone, now applied here too.
- Found and fixed a page-level horizontal-scroll regression at 380px width
  in Full Model mode: a `flex-1` ancestor chain needs explicit `min-w-0`
  for a `overflow-x-auto` table further down to actually clip and scroll
  internally instead of forcing the whole page wider — a real CSS gotcha,
  not previously hit because Milestone 1's layout had no wide tables.
- Methodology page extended with the waterfall order, floating-rate/PIK
  mechanics, and the covenant/headroom definitions; the simplifications
  list now covers prepayment penalty (captured, not yet applied), maturity
  (not enforced), and the free-cash-flow-yield convention.

### Open points for the sponsor

- **The app's default view no longer opens on Reference Case 1's exact
  numbers.** Milestone 1's fix made the default deal Reference Case 1
  itself specifically so the app doubled as a standing acceptance check;
  this milestone's brief separately specifies the mid-market five-tranche
  structure as "Voreinstellung bei neuem Deal." Both can't be true at once,
  so the newer, more specific instruction won. Reference Case 1 still
  passes as an automated test — it's just no longer literally what the
  app shows on load (now ~19.9% IRR / 2.47x). Say the word if you want it
  reverted.
- Essentials' slider count is 10, not the "acht Kernregler" mentioned —
  same tension flagged at the end of the previous milestone, unresolved
  either way pending your call on what to trim.
- Prepayment penalty and call protection are UI-editable (so your next
  reference case can be entered in full) but not yet economically applied
  in the cash flow — flagged rather than guessed, since the spec's
  seven-step waterfall didn't include them and I didn't want to invent the
  convention for how a penalty gets funded.
- One-off costs per year is the only per-year operating override that
  exists before Milestone 3 — if your next reference case's downturn year
  needs an actual revenue/margin shock rather than a cash cost, that's not
  buildable through the UI yet.
- Senior debt/EBITDA covenant defaults to disabled (no default threshold
  was specified for it, unlike the other three) — enable it and set a
  threshold on the Capital Structure tab if you want it checked from the
  start.

## Milestone 2 follow-up: presets, prepayment penalty, per-year growth (2026-08-23)

Response to three points raised at Milestone 2 review. All three
implemented; 68 tests green (58 + 10 new), Reference Case 1 unchanged.

### 1. Startup state reverted to Reference Case 1 — via a shared source, not a second fixture

- The app opening on the wrong numbers while the reference-case test
  passed was traced (per the sponsor's diagnostic request) to incomplete
  work, not a calculation bug — confirmed by running the test in isolation
  and comparing the test's inputs against the app's default inputs
  side-by-side before changing anything.
- Fixed at the root: `presets.ts` (new) now holds the ONE definition of
  Reference Case 1 (`buildReferenceCaseInputs()`) and of the European
  mid-market structure (`buildEuropeanMidMarketInputs()`). Both
  `referenceCase1.test.ts` and `defaults.ts` — and so the app's actual
  startup state — build from the same function. A new test
  (`appDefaults.test.ts`) asserts `buildDefaultDealInputs()` itself
  produces 20.20% / 2.509x, i.e. it tests the real startup path, not a
  separately-typed copy of it — this specific class of drift can't happen
  silently again.
- A "Preset" selector (Reference case / European mid-market) lets either
  structure be loaded on demand; loading one replaces the entire deal
  state and asks first if the current state has diverged from whichever
  preset was last loaded (no save system exists yet to fall back on, so an
  unconfirmed overwrite would just lose the edits).

### 2. Prepayment penalty wired into the waterfall

- Charged on cash sweep and revolver paydown only, only inside
  `callProtectionYears`, never on scheduled amortization — per the
  sponsor's specified convention. % × the amount actually repaid, funded
  from the same period's excess-cash pool ahead of the next tranche in
  rank order (sized so repayment + its own penalty can never draw the pool
  negative). New fields: `TrancheYear.prepaymentPenaltyPaid`,
  `DebtYear.totalPrepaymentPenalties`.
- 4 new tests: charged within protection, zero once protection lapses,
  never on scheduled amortization even when fully inside the protection
  window, and a same-debt-repaid / lower-leftover-cash check confirming
  it's a real cash cost and not just bookkeeping.

### 3. Revenue growth, per year — brought forward from Milestone 3

- `OperatingInputs` gained `revenueGrowthMode` ('flat' | 'perYear') and
  `revenueGrowthByYear`, both optional so every existing fixture keeps
  compiling and behaving identically. A year missing from the per-year
  table falls back to the flat rate.
- Essentials gained a Uniform/Per-year toggle on the revenue growth
  control; switching to per-year seeds the table from the current flat
  rate (so the existing assumption isn't discarded) and switching back
  keeps the table intact for next time. Margin, capex and working capital
  are untouched, as instructed — still single assumptions until Milestone
  3's full per-year tables.
- Browser-verified end to end with the sponsor's own downturn shape
  (+6%, −20%, −20%, −20%, 0%) on the European mid-market preset: real
  financial distress shows up correctly — net debt/EBITDA climbing to
  7.06x, debt service coverage falling to 0.49x, plain-sentence covenant
  breach messages, negative IRR, the equity wedge visibly compressing in
  the value-split chart. The revolver itself doesn't draw in that specific
  run (2.0 minimum cash still had enough slack) — that's a property of
  those inputs, not a gap in the logic; the revolver-draw test
  (`capitalStructure.test.ts`, a large one-off cost) already exercises the
  draw/repay path directly. Flagging in case a steeper shock or a higher
  minimum cash is what's wanted to see it engage in the sponsor's own
  case.

## Two findings from Reference Case B review (2026-08-23)

### Bug: Senior debt / EBITDA undercounted Term Loan B

- Confirmed as a real bug, not just an unusual reading: Term Loan A and
  Term Loan B are both senior secured debt, but the metric used the
  waterfall's seniority *rank* as the classification (rank ≤ 1), which
  only ever meant "gets paid first," not "is senior debt" — so TLB (rank
  2) was silently excluded, understating the ratio (1.43x shown vs.
  ~3.3–3.4x correct).
- Fixed by decoupling the two concepts: `seniorRankThreshold` removed from
  `CovenantSettings` entirely; senior/subordinated is now a classification
  (`DebtTranche.isSeniorDebt`, optional, defaulting to true for
  `termLoan`/`revolver` and false for `mezzanine`/`sellerNote`, overridable
  per tranche for an atypical structure). Verified live on the European
  mid-market preset: 3.32x in year 1, matching the sponsor's hand check of
  "around 3.4x." 2 new tests, including that a per-tranche override wins
  over the type-based default.

### Save/name/reopen — built

- `savedCases.ts`: versioned localStorage module (list, get, create,
  update, rename, duplicate, delete, export all as JSON, import that
  merges by id without overwriting existing entries), every mutating
  operation returning an explicit ok/error result rather than throwing —
  a full or unavailable browser storage surfaces as a message, not a
  crash. 10 tests: save/load round-trips to the same state, update keeps
  the id, delete removes only the chosen entry, export→import into an
  empty store reproduces the same set, and import is a merge (skips
  what's already there) rather than a replace.
- Calculator page: Save (overwrites the open case, or behaves like Save
  as new if nothing's open yet), Save as new (only shown once a case is
  open, per the brief), the open case's name with a small dot when it's
  diverged from what's saved.
- `/saved` rebuilt from the Part-A stub: sortable list (name/date) with
  IRR/multiple/entry-leverage columns computed at save time (not live —
  deliberately, so the list doesn't re-run the engine for every row on
  every render), open/rename/duplicate/delete (with confirmation)/copy
  link per row, multi-select comparison table, Export all / Import,
  empty state, and a quiet note about the storage being local to this
  browser.
- Preset switching and opening a saved case can now interact — fixed
  before it caused a stale "unsaved changes" prompt: applying a preset
  clears which case was open, and the unsaved-changes check compares
  against the open case's own inputs when one is open, rather than
  always against the last preset loaded.
- Browser-verified end to end: save, edit, see the dot, overwrite-save,
  save-as-new, open from the list, multi-select compare, delete (only
  the selected row gone) — no console errors anywhere in the flow.
- Not built: the "you opened a shared link — save it locally?" banner
  from the original brief. Save is now always visible regardless of how
  the state was loaded (preset, shared link, or manual edits), so the
  capability exists either way — the banner would only save a few clicks.
  Flagging the scope cut rather than silently dropping it.

80 tests total, all green.

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
