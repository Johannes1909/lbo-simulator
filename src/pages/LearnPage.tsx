import type { ReactNode } from 'react'
import { glossaryEntries, learnSections, type LearnSection } from '../content/learn'
import { en } from '../i18n/en'
import { runModel } from '../model/engine'
import { buildDefaultDealInputs } from '../model/defaults'
import { enterpriseValue, entryEbitda } from '../model/sourcesUses'
import type { DealInputs } from '../model/types'
import { Link } from '../ui/Link'
import { formatMoney, formatNumber, formatPercent } from '../ui/format'
import { ComparisonTable, type ComparisonCase } from '../ui/learn/ComparisonTable'
import { GlossaryList } from '../ui/learn/GlossaryList'
import { SimpleBarChart } from '../ui/learn/SimpleBarChart'

const defaultInputs = buildDefaultDealInputs()
const defaultOutput = runModel(defaultInputs)
const defaultEv = enterpriseValue(defaultInputs)

/** Same base case, tranche re-sized to a given % of enterprise value (0 = all-equity). */
function withLeverage(base: DealInputs, leverageOfEv: number): DealInputs {
  if (leverageOfEv <= 0) {
    return { ...base, financing: { ...base.financing, tranches: [] } }
  }
  const baseTranche = base.financing.tranches[0]!
  const ev = enterpriseValue(base)
  return {
    ...base,
    financing: {
      ...base.financing,
      tranches: [{ ...baseTranche, amount: { mode: 'absolute', value: ev * leverageOfEv } }],
    },
  }
}

/** Same base case, held to and exited in a given year (hold period follows exit year, same as the calculator's own slider). */
function withExitYear(base: DealInputs, exitYear: number): DealInputs {
  return {
    ...base,
    transaction: { ...base.transaction, holdPeriodYears: exitYear },
    exit: { ...base.exit, exitYear },
  }
}

// ---- Section 2: the leverage effect ----
const allEquityInputs = withLeverage(defaultInputs, 0)
const leveredInputs = withLeverage(defaultInputs, 0.55) // = the default deal itself
const leverageComparisonCases: ComparisonCase[] = [
  { label: 'All equity', inputs: allEquityInputs },
  { label: '55% debt funded', inputs: leveredInputs },
]
const allEquityOutput = runModel(allEquityInputs)
const leveredOutput = runModel(leveredInputs)
const leverageIrrBars = [
  { label: 'All equity', value: (allEquityOutput.returns.irr ?? 0) * 100 },
  { label: '55% debt funded', value: (leveredOutput.returns.irr ?? 0) * 100 },
]

// ---- Section 4: where the risk sits ----
// Matches src/content/learn.ts's "twenty percent a year for three
// consecutive years" — a milder flat -8%/year used to sit here, which left
// the 55%-debt column with a loss (101.9 equity, -8.9% IRR) rather than the
// near-wipeout the paragraph below the table describes.
const stressBase: DealInputs = {
  ...defaultInputs,
  operating: {
    ...defaultInputs.operating,
    revenueGrowthMode: 'perYear',
    revenueGrowthByYear: [6, -20, -20, -20, 0],
  },
}
const stressComparisonCases: ComparisonCase[] = [
  { label: '30% debt funded', inputs: withLeverage(stressBase, 0.3) },
  { label: '55% debt funded', inputs: withLeverage(stressBase, 0.55) },
]

// ---- Section 5: why the exit year matters ----
const exitYearComparisonCases: ComparisonCase[] = [
  { label: 'Exit in year 3', inputs: withExitYear(defaultInputs, 3) },
  { label: 'Exit in year 6', inputs: withExitYear(defaultInputs, 6) },
]

// ---- Placeholder values, computed from the model, never hand-entered ----
const interestY1 = leveredOutput.incomeYears[0]!.interestExpense
const taxRatePct = defaultInputs.operating.taxRatePct
const taxShieldY1 = interestY1 * (taxRatePct / 100)

const placeholdersBySection: Record<string, Record<string, string>> = {
  'what-is-an-lbo': {
    ebitda0: formatMoney(entryEbitda(defaultInputs)),
    entryMultiple: formatNumber(defaultInputs.transaction.entryMultiple, 1),
    enterpriseValue: formatMoney(defaultEv),
    holdPeriod: formatNumber(defaultInputs.transaction.holdPeriodYears, 0),
  },
  'the-leverage-effect': {
    interestY1: formatMoney(interestY1),
    taxRate: formatPercent(taxRatePct),
    taxShieldY1: formatMoney(taxShieldY1),
  },
  'where-returns-come-from': {
    bridgeEbitdaGrowth: formatMoney(defaultOutput.valueBridge.ebitdaGrowthEffect),
    bridgeMultipleChange: formatMoney(defaultOutput.valueBridge.multipleEffect),
    bridgeDeleveraging: formatMoney(defaultOutput.valueBridge.deleveragingEffect),
  },
}

const PLACEHOLDER_PATTERN = /(\{[a-zA-Z0-9]+\})/g

/** Replaces {key} tokens with the section's computed values, in monospace like every other figure in the app. Unmatched keys render loudly, in the warning color, instead of silently vanishing. */
function renderParagraph(text: string, values: Record<string, string> | undefined): ReactNode {
  const parts = text.split(PLACEHOLDER_PATTERN)
  return parts.map((part, i) => {
    const match = part.match(/^\{([a-zA-Z0-9]+)\}$/)
    if (!match) return <span key={i}>{part}</span>
    const key = match[1]!
    const value = values?.[key]
    if (value === undefined) {
      return (
        <span key={i} style={{ color: 'var(--color-warning)' }}>
          {`{${key}}`}
        </span>
      )
    }
    return (
      <span key={i} className="font-figures">
        {value}
      </span>
    )
  })
}

function ContentPendingBadge() {
  return (
    <span
      className="inline-block border px-2 py-0.5 text-xs uppercase tracking-wide"
      style={{ borderColor: 'var(--color-border-strong)', color: 'var(--color-text-muted)' }}
    >
      {en.learn.contentPending}
    </span>
  )
}

function Paragraph({ text, values }: { text: string; values: Record<string, string> | undefined }) {
  return (
    <p className="mb-3 leading-relaxed" style={{ color: 'var(--color-text)' }}>
      {renderParagraph(text, values)}
    </p>
  )
}

/**
 * Section bodies are hand-arranged per section because components sit
 * BETWEEN specific paragraphs, not just after all of them — the text
 * itself still comes only from learnSections/glossaryEntries.
 */
function SectionBody({ section }: { section: LearnSection }) {
  const values = placeholdersBySection[section.id]
  const p = (i: number) => <Paragraph key={i} text={section.paragraphs[i]!} values={values} />

  switch (section.id) {
    case 'the-leverage-effect':
      return (
        <>
          {p(0)}
          <div className="my-6">
            <ComparisonTable cases={leverageComparisonCases} />
          </div>
          {p(1)}
          {p(2)}
          <div className="mt-6 max-w-sm">
            <SimpleBarChart bars={leverageIrrBars} formatValue={(v) => formatPercent(v, 1)} />
          </div>
        </>
      )
    case 'where-the-risk-sits':
      return (
        <>
          {p(0)}
          {p(1)}
          <div className="my-6">
            <ComparisonTable
              cases={stressComparisonCases}
              metrics={['exitEbitda', 'exitNetDebt', 'netDebtToEbitda', 'exitEquity', 'irr']}
            />
          </div>
          {p(2)}
        </>
      )
    case 'why-timing-matters':
      return (
        <>
          {p(0)}
          <div className="my-6">
            <ComparisonTable cases={exitYearComparisonCases} metrics={['exitEquity', 'moneyMultiple', 'irr']} />
          </div>
          {p(1)}
        </>
      )
    case 'glossary':
      return (
        <>
          {glossaryEntries.length === 0 && <ContentPendingBadge />}
          <GlossaryList entries={glossaryEntries} />
        </>
      )
    default:
      return (
        <>
          {section.paragraphs.length === 0 && <ContentPendingBadge />}
          {section.paragraphs.map((_, i) => p(i))}
        </>
      )
  }
}

export function LearnPage() {
  return (
    <main className="flex-1 px-6 py-10">
      <div className="max-w-2xl mx-auto w-full">
        <h1 className="text-3xl mb-8">{en.learn.title}</h1>

        <nav aria-label={en.learn.tableOfContents} className="mb-12 flex flex-col gap-1">
          {learnSections.map((s) => (
            <a key={s.id} href={`#${s.id}`} className="text-sm underline" style={{ color: 'var(--color-text-muted)' }}>
              {s.heading}
            </a>
          ))}
        </nav>

        <div className="flex flex-col gap-16">
          {learnSections.map((s) => (
            <section key={s.id} id={s.id} className="scroll-mt-20">
              <h2 className="text-2xl mb-3">{s.heading}</h2>
              <SectionBody section={s} />
            </section>
          ))}
        </div>

        <p className="mt-16 text-sm" style={{ color: 'var(--color-text-muted)' }}>
          {en.learn.seeAlsoMethodology} <Link to="/methodology" className="underline">Methodology</Link>.
        </p>
      </div>
    </main>
  )
}
