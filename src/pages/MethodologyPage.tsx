import { en } from '../i18n/en'
import { Link } from '../ui/Link'

/**
 * Describes how the numbers are calculated. Deliberately no investment
 * advice or opinions here — just the calculation paths, so a reader can
 * check them against their own model. Companion to /learn: this page is
 * HOW the numbers are computed; /learn is WHY the mechanics matter.
 */
export function MethodologyPage() {
  return (
    <main className="flex-1 overflow-y-auto">
      <div className="max-w-3xl mx-auto px-6 py-10 flex flex-col gap-6">
        <h1 className="text-2xl">Methodology</h1>

        <section className="flex flex-col gap-2">
          <h2 className="text-lg">Sources &amp; Uses</h2>
          <p>
            Enterprise value = LTM EBITDA × entry multiple. Uses = equity purchase price (EV
            minus the target's existing net debt, which is refinanced separately) + transaction
            costs + the minimum cash balance funded at close. Sources = debt tranches + sponsor
            equity, where sponsor equity is the residual that makes Sources equal Uses (unless a
            fixed sponsor equity amount is set instead — in that case any imbalance is reported as
            a warning rather than silently absorbed).
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-lg">Interest and the circularity it creates</h2>
          <p>
            Interest can be calculated two ways: on the balance at the end of the prior year (no
            circularity — this year's interest never depends on this year's paydown), or on the
            average of the opening and closing balance (the more accurate treatment once a
            tranche amortizes mid-year, but it means the closing balance depends on interest,
            which depends on the closing balance). The average-balance mode is solved by
            iteration: guess a closing balance, compute interest and free cash flow, get a new
            closing balance, repeat — up to 50 times per year, stopping once the balance changes
            by less than 0.001. If it hasn't settled by then, the year is flagged with a
            convergence warning instead of reporting an unresolved number.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-lg">Cash sweep waterfall</h2>
          <p>
            Each year: scheduled amortization is paid first (capped at what cash actually allows —
            Milestone 1 has a single tranche and no revolving credit line yet, so a shortfall is
            reported as a liquidity warning rather than drawn from a facility that doesn't exist
            in this version). Whatever cash remains above the minimum cash balance then sweeps
            against the tranche, up to its configured participation percentage. A tranche balance
            never goes below zero.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-lg">IRR and money multiple</h2>
          <p>
            IRR is solved by bisection over the actual equity cash flow series (entry outflow,
            any interim distributions, exit proceeds) — not the two-cash-flow closed-form formula,
            which is wrong the moment interim cash flows exist. The search covers −99% to +1000%
            with a tolerance of 1e-7; if the cash flows never change sign, no IRR exists and the
            model reports that rather than a number. Money multiple is total cash returned divided
            by total cash invested.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-lg">Value creation bridge</h2>
          <p>
            The equity value change is split into three effects: EBITDA growth (the EBITDA
            increase priced at the entry multiple), multiple change (the exit EBITDA priced at the
            change in multiple), and a residual bucket — "deleveraging &amp; other" — that captures
            everything else: debt paydown, transaction costs, and any modeling residual. That
            bucket is calculated as the plug that makes the bridge reconcile exactly to the entry-
            to-exit equity difference, by construction, not by coincidence.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-lg">Simplifications in this version</h2>
          <ul className="list-disc pl-5 flex flex-col gap-1">
            <li>Net operating loss carryforwards are unlimited and fully usable — no cap on annual usage. A more realistic cap arrives later.</li>
            <li>Closing is always treated as the start of a full year — no stub period for a mid-year transaction date yet.</li>
            <li>One tranche, cash-pay, fixed rate — PIK interest, floating rates, a revolving credit line and multi-tranche seniority arrive in Milestone 2.</li>
            <li>No management rollover, sweet equity or dividend recapitalization yet — Milestone 3.</li>
          </ul>
        </section>

        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          {en.methodology.seeAlsoLearn} <Link to="/learn" className="underline">How it works</Link>.
        </p>
      </div>
    </main>
  )
}
