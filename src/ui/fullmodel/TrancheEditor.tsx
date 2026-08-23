import { useState } from 'react'
import type { DebtTranche, RateType, TrancheType } from '../../model/types'
import { formatMoney, formatPercent } from '../format'
import { TableNumberInput, TableSelect, TableTextInput } from './tableInputs'

const TRANCHE_TYPE_OPTIONS: { value: TrancheType; label: string }[] = [
  { value: 'termLoan', label: 'Term loan' },
  { value: 'revolver', label: 'Revolver' },
  { value: 'mezzanine', label: 'Mezzanine' },
  { value: 'sellerNote', label: "Seller's note" },
]

interface TrancheEditorProps {
  tranche: DebtTranche
  debtEbitda: number
  closingBalanceAtExit: number | null
  maturesBeforeHoldEnd: boolean
  onChange: (next: DebtTranche) => void
  onDuplicate: () => void
  onRemove: () => void
}

export function TrancheEditor({
  tranche: t,
  debtEbitda,
  closingBalanceAtExit,
  maturesBeforeHoldEnd,
  onChange,
  onDuplicate,
  onRemove,
}: TrancheEditorProps) {
  const [expanded, setExpanded] = useState(false)

  function patch(fn: (draft: DebtTranche) => void) {
    const next = structuredClone(t)
    fn(next)
    onChange(next)
  }

  const resolvedAmount = t.amount.mode === 'absolute' ? t.amount.value : t.amount.value * debtEbitda
  const isRevolver = t.trancheType === 'revolver'
  const rateKind = t.rate?.kind ?? 'fixed'

  const rateSummary =
    rateKind === 'floating'
      ? `Ref + ${formatPercent(t.rate && t.rate.kind === 'floating' ? t.rate.marginPct : 0, 2)}`
      : formatPercent(t.fixedRatePct, 2)

  return (
    <div className="border-b" style={{ borderColor: 'var(--color-border)' }}>
      <div className="flex items-center gap-3 py-2 text-sm">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          className="cursor-pointer w-5 text-left"
          style={{ color: 'var(--color-brass)' }}
          aria-label={expanded ? 'Collapse tranche details' : 'Expand tranche details'}
        >
          {expanded ? '▾' : '▸'}
        </button>
        <div className="w-40">
          <TableTextInput
            value={t.name}
            onChange={(v) => patch((d) => (d.name = v))}
            width="w-full"
            ariaLabel="Tranche name"
          />
        </div>
        <div className="w-28">
          <TableSelect
            value={t.trancheType ?? 'termLoan'}
            onChange={(v) => patch((d) => (d.trancheType = v))}
            options={TRANCHE_TYPE_OPTIONS}
            ariaLabel="Tranche type"
          />
        </div>
        <div className="w-14">
          <TableNumberInput
            value={t.seniorityRank}
            onChange={(v) => patch((d) => (d.seniorityRank = Math.round(v)))}
            step={1}
            min={1}
            width="w-full"
            ariaLabel="Seniority rank"
          />
        </div>
        <div className="flex-1 text-right font-figures" style={{ color: 'var(--color-text)' }}>
          {isRevolver ? `${formatMoney(resolvedAmount)} committed` : formatMoney(resolvedAmount)}
        </div>
        <div className="w-28 text-right font-figures" style={{ color: 'var(--color-text-muted)' }}>
          {rateSummary}
        </div>
        <div className="w-28 text-right font-figures" style={{ color: 'var(--color-text-muted)' }}>
          {closingBalanceAtExit !== null ? formatMoney(closingBalanceAtExit) : '—'}
        </div>
        <button type="button" onClick={onDuplicate} className="text-xs underline cursor-pointer" style={{ color: 'var(--color-text-muted)' }}>
          Duplicate
        </button>
        <button type="button" onClick={onRemove} className="text-xs underline cursor-pointer" style={{ color: 'var(--color-warning)' }}>
          Remove
        </button>
      </div>

      {maturesBeforeHoldEnd && (
        <p className="text-xs pb-2" style={{ color: 'var(--color-warning)' }}>
          This tranche matures before the hold period ends — in reality it would need refinancing.
        </p>
      )}

      {expanded && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-3 pb-4 text-sm">
          <label className="flex flex-col gap-1">
            <span style={{ color: 'var(--color-text-muted)' }}>Amount mode</span>
            <TableSelect
              value={t.amount.mode}
              onChange={(v) =>
                patch((d) => {
                  d.amount = v === 'absolute' ? { mode: 'absolute', value: resolvedAmount } : { mode: 'multipleOfEbitda', value: debtEbitda > 0 ? resolvedAmount / debtEbitda : 0 }
                })
              }
              options={[
                { value: 'absolute', label: 'Absolute' },
                { value: 'multipleOfEbitda', label: '× EBITDA' },
              ]}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span style={{ color: 'var(--color-text-muted)' }}>{isRevolver ? 'Committed amount' : 'Amount'}</span>
            <TableNumberInput
              value={t.amount.value}
              onChange={(v) => patch((d) => (d.amount = { ...d.amount, value: v }))}
              step={t.amount.mode === 'multipleOfEbitda' ? 0.05 : 1}
              width="w-full"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span style={{ color: 'var(--color-text-muted)' }}>Rate type</span>
            <TableSelect
              value={rateKind}
              onChange={(v) =>
                patch((d) => {
                  const rate: RateType =
                    v === 'floating' ? { kind: 'floating', marginPct: 3.0 } : { kind: 'fixed', ratePct: d.fixedRatePct }
                  d.rate = rate
                })
              }
              options={[
                { value: 'fixed', label: 'Fixed' },
                { value: 'floating', label: 'Reference + margin' },
              ]}
            />
          </label>
          {rateKind === 'fixed' ? (
            <label className="flex flex-col gap-1">
              <span style={{ color: 'var(--color-text-muted)' }}>Fixed rate (%)</span>
              <TableNumberInput
                value={t.fixedRatePct}
                onChange={(v) =>
                  patch((d) => {
                    d.fixedRatePct = v
                    if (d.rate?.kind === 'fixed') d.rate = { kind: 'fixed', ratePct: v }
                  })
                }
                step={0.05}
                width="w-full"
              />
            </label>
          ) : (
            <label className="flex flex-col gap-1">
              <span style={{ color: 'var(--color-text-muted)' }}>Margin over reference (%)</span>
              <TableNumberInput
                value={t.rate?.kind === 'floating' ? t.rate.marginPct : 0}
                onChange={(v) =>
                  patch((d) => {
                    d.rate = { kind: 'floating', marginPct: v, floorPct: d.rate?.kind === 'floating' ? d.rate.floorPct : undefined }
                  })
                }
                step={0.05}
                width="w-full"
              />
            </label>
          )}
          {rateKind === 'floating' && (
            <label className="flex flex-col gap-1">
              <span style={{ color: 'var(--color-text-muted)' }}>Rate floor (%, optional)</span>
              <TableNumberInput
                value={t.rate?.kind === 'floating' ? (t.rate.floorPct ?? 0) : 0}
                onChange={(v) =>
                  patch((d) => {
                    if (d.rate?.kind === 'floating') d.rate = { ...d.rate, floorPct: v }
                  })
                }
                step={0.05}
                width="w-full"
              />
            </label>
          )}

          <label className="flex flex-col gap-1">
            <span style={{ color: 'var(--color-text-muted)' }}>Cash-pay share (%)</span>
            <TableNumberInput
              value={t.cashPayPct ?? 100}
              onChange={(v) => patch((d) => (d.cashPayPct = Math.min(100, Math.max(0, v))))}
              step={5}
              min={0}
              max={100}
              width="w-full"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span style={{ color: 'var(--color-text-muted)' }}>Scheduled amortization (% p.a.)</span>
            <TableNumberInput
              value={t.scheduledAmortizationPctOfOriginal}
              onChange={(v) => patch((d) => (d.scheduledAmortizationPctOfOriginal = v))}
              step={0.5}
              disabled={isRevolver}
              width="w-full"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span style={{ color: 'var(--color-text-muted)' }}>Cash sweep participation (%)</span>
            <TableNumberInput
              value={t.cashSweepParticipationPct}
              onChange={(v) => patch((d) => (d.cashSweepParticipationPct = Math.min(100, Math.max(0, v))))}
              step={5}
              min={0}
              max={100}
              disabled={isRevolver}
              width="w-full"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span style={{ color: 'var(--color-text-muted)' }}>Maturity (years)</span>
            <TableNumberInput
              value={t.maturityYears ?? 10}
              onChange={(v) => patch((d) => (d.maturityYears = Math.round(v)))}
              step={1}
              min={1}
              width="w-full"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span style={{ color: 'var(--color-text-muted)' }}>Prepayment penalty (%)</span>
            <TableNumberInput
              value={t.prepaymentPenaltyPct ?? 0}
              onChange={(v) => patch((d) => (d.prepaymentPenaltyPct = v))}
              step={0.5}
              width="w-full"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span style={{ color: 'var(--color-text-muted)' }}>Call protection (years)</span>
            <TableNumberInput
              value={t.callProtectionYears ?? 0}
              onChange={(v) => patch((d) => (d.callProtectionYears = Math.round(v)))}
              step={1}
              min={0}
              width="w-full"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span style={{ color: 'var(--color-text-muted)' }}>Arrangement fee (%)</span>
            <TableNumberInput
              value={t.arrangementFeePct ?? 0}
              onChange={(v) => patch((d) => (d.arrangementFeePct = v))}
              step={0.1}
              width="w-full"
            />
          </label>
          {isRevolver && (
            <>
              <label className="flex flex-col gap-1">
                <span style={{ color: 'var(--color-text-muted)' }}>Commitment fee (%, on undrawn)</span>
                <TableNumberInput
                  value={t.commitmentFeePct ?? 0}
                  onChange={(v) => patch((d) => (d.commitmentFeePct = v))}
                  step={0.1}
                  width="w-full"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span style={{ color: 'var(--color-text-muted)' }}>Drawn at close</span>
                <TableNumberInput
                  value={t.initialDrawnAmount ?? 0}
                  onChange={(v) => patch((d) => (d.initialDrawnAmount = v))}
                  step={1}
                  min={0}
                  width="w-full"
                />
              </label>
            </>
          )}
        </div>
      )}
    </div>
  )
}

