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
            Each year, in this order: cash interest on every tranche; PIK interest capitalizes onto
            the tranches that carry it; the commitment fee on any undrawn revolver; scheduled
            amortization by seniority rank, capped at what cash actually allows; if cash still won't
            cover the minimum balance, the revolver draws up to its committed limit (a shortfall
            beyond that is reported, not silently absorbed); any excess above the minimum first
            repays a drawn revolver, then sweeps the remaining tranches strictly in rank order, each
            up to its configured participation percentage — a subordinated tranche never receives
            sweep cash while a senior tranche with sweep participation still has an unpaid balance
            at the end of that same period. No tranche balance ever goes below zero.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-lg">Floating rates and PIK</h2>
          <p>
            A floating-rate tranche's coupon is the deal's reference rate curve (a flat % by
            default, overridable year by year) plus the tranche's own margin, with an optional
            floor. A tranche's coupon can be split between cash and PIK by a configurable
            percentage — the PIK share capitalizes onto the balance and is not a cash outflow, but
            it is still tax-deductible, exactly like cash interest.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-lg">Prepayment penalty</h2>
          <p>
            Charged on any voluntary early repayment — a cash sweep or a revolver paydown — while
            the tranche is still inside its call-protection window; never on scheduled amortization,
            and never once that window has passed. The penalty is % × the amount actually repaid,
            paid in cash the same year, funded from the same pool of excess cash the repayment came
            from — so it reduces what's left for the next tranche in the rank order that same
            period, exactly as if it were one more claim on that period's cash sweep. The repayment
            itself is sized so that repayment plus its own penalty never draws the pool below zero.
          </p>
        </section>

        <section className="flex flex-col gap-2">
          <h2 className="text-lg">Credit metrics and covenants</h2>
          <p>
            Net debt / EBITDA and senior debt / EBITDA (tranches at or above a configurable
            seniority rank) use closing balances; interest coverage is EBITDA over cash interest
            only (PIK is excluded, since it isn't a cash claim on the business); debt service
            coverage is free cash flow over cash interest plus scheduled amortization. Each
            covenant has its own enable switch and threshold; headroom is the % distance from the
            threshold, positive when comfortable and negative when breached, and a breach is
            reported as a plain sentence rather than just a red flag.
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
            <li>A tranche's maturity doesn't force repayment or refinancing in the engine — if it falls before the hold period ends, the Capital Structure tab flags it, but the schedule still runs the balance through to exit.</li>
            <li>Free cash flow yield is free cash flow (before debt service) divided by the entry enterprise value, held constant across years — a convention, flagged for confirmation, not a market-standard definition.</li>
            <li>No management rollover economics, sweet equity waterfall, ratchet, or dividend recapitalization yet — Milestone 3. Management rollover currently only reduces the sponsor's cash equity need in Sources & Uses.</li>
            <li>Revenue growth can be set per year (brought forward from Milestone 3 specifically to test the revolver against a downturn); margin, capex, working capital and one-off costs are still single assumptions for the whole hold period, except one-off costs, which are already a per-year table. Their per-year overrides arrive in Milestone 3.</li>
          </ul>
        </section>

        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          {en.methodology.seeAlsoLearn} <Link to="/learn" className="underline">How it works</Link>.
        </p>
      </div>
    </main>
  )
}
