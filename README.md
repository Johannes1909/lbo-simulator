# LBO Simulator

An interactive leveraged buyout model. Move a lever, watch the return —
and the risk — move with it.

**Live: https://lbo-simulator-lake.vercel.app**

## What it does

A leveraged buyout finances most of a company's purchase price with debt
that the acquired business itself repays. This tool models that
mechanic: adjust the entry multiple, leverage, growth assumptions and
exit multiple, and see the debt schedule, credit metrics and equity
return update in real time.

Two modes:

- **Essentials** — eight core levers, the deal tombstone, three charts
- **Full model** — sources & uses, multiple debt tranches with a
  repayment waterfall, PIK interest, a revolving credit facility,
  covenant testing with headroom

## How the model works

Each period runs: revenue → EBITDA → depreciation → interest → tax →
free cash flow → repayment waterfall. Cash flow first covers mandatory
amortisation, then draws on the revolver if it falls short, then sweeps
any surplus to the tranches in order of seniority. PIK interest
capitalises onto the tranche balance rather than being paid in cash.

Returns are calculated from a real equity cash flow series, with IRR
solved by bisection — not from a simplified multiple formula, so
interim distributions and recapitalisations can be modelled correctly.

Interest can be computed on the opening balance or on average balances;
the latter is circular and resolved by iteration.

Full detail, including every formula and convention, is on the
Methodology page.

## Verification

The model is tested against three reference cases built independently
in Excel and calculated by hand:

- **Case A** — single tranche, 100 % cash sweep, no amortisation
- **Case B** — four tranches, seniority waterfall, PIK interest,
  transaction costs
- **Case B2** — stress scenario: three consecutive years of decline,
  revolver drawdown, negative free cash flow, equity nearly wiped out

Every figure in the debt schedule, credit metrics and returns matches
the hand calculation to two decimal places.

## Stack

React, TypeScript, Vite. No backend, no accounts, no database — the
complete deal state is encoded in the URL, so any scenario can be shared
as a link. Charts are hand-built SVG.

The model lives in `src/model/` as pure functions with no UI
dependencies, covered by unit tests plus an integration layer that
drives the actual interface components.

## Running locally

```
npm install
npm run dev
```

Other useful commands:

```
npm run test    # run the test suite once
npm run build   # type-check and build for production
```
