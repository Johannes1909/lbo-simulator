import { en } from '../i18n/en'
import { debtSizingEbitda, enterpriseValue } from '../model/sourcesUses'
import { useCalculatorMode } from '../state/useCalculatorMode'
import { useDealStore } from '../state/store'
import { useModelOutput } from '../state/useModelOutput'
import { DeleveragingChart } from '../ui/charts/DeleveragingChart'
import { ValueBridgeChart } from '../ui/charts/ValueBridgeChart'
import { ValueSplitChart } from '../ui/charts/ValueSplitChart'
import { EssentialsControls } from '../ui/EssentialsControls'
import { FullModelView } from '../ui/fullmodel/FullModelView'
import { PresetSelector } from '../ui/PresetSelector'
import { ResultBar } from '../ui/ResultBar'
import { SaveControls } from '../ui/SaveControls'
import { ShareLinkButton } from '../ui/ShareLinkButton'
import { SourcesUsesPanel } from '../ui/SourcesUsesPanel'
import { Tombstone } from '../ui/Tombstone'
import { WarningsPanel } from '../ui/WarningsPanel'

/**
 * The calculator stays clean by design: no explainer text, no info bubbles,
 * no question marks on the controls. All explanation lives on /learn and
 * /methodology. Essentials and Full Model share the same deal state —
 * switching modes never resets anything.
 */
export function CalculatorPage() {
  const inputs = useDealStore((s) => s.inputs)
  const output = useModelOutput()
  const { mode, setMode } = useCalculatorMode()

  return (
    <div className="flex flex-col flex-1 min-w-0">
      <ResultBar output={output} />

      <header className="px-6 py-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl">{en.app.title}</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
            {en.app.tagline}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <PresetSelector />
          <div className="flex border" style={{ borderColor: 'var(--color-border-strong)' }}>
            {(['essentials', 'fullModel'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                aria-pressed={mode === m}
                className="text-sm px-3 py-1.5 cursor-pointer"
                style={{
                  color: mode === m ? 'var(--color-bg)' : 'var(--color-text-muted)',
                  background: mode === m ? 'var(--color-brass)' : 'transparent',
                }}
              >
                {m === 'essentials' ? en.mode.essentials : en.mode.fullModel}
              </button>
            ))}
          </div>
          <SaveControls />
          <ShareLinkButton />
        </div>
      </header>

      <div className="px-6">
        <Tombstone
          entryMultiple={inputs.transaction.entryMultiple}
          enterpriseValue={enterpriseValue(inputs)}
          equityInvested={output.sourcesUses.sourcesSponsorEquity}
          holdPeriodYears={inputs.transaction.holdPeriodYears}
          exitMultiple={
            inputs.exit.exitMultipleEqualsEntry ? inputs.transaction.entryMultiple : inputs.exit.exitMultiple
          }
        />
      </div>

      {mode === 'essentials' ? (
        <main className="flex-1 px-6 py-8 grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-8">
          <aside aria-label="Deal inputs">
            <EssentialsControls />
          </aside>

          <section className="flex flex-col gap-8" aria-label="Results">
            <WarningsPanel warnings={output.warnings} />

            <SourcesUsesPanel sourcesUses={output.sourcesUses} />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <DeleveragingChart inputs={inputs} output={output} />
              <ValueSplitChart inputs={inputs} output={output} />
            </div>

            <ValueBridgeChart bridge={output.valueBridge} />

            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              EBITDA used to size any "× EBITDA" debt tranche: {debtSizingEbitda(inputs).toFixed(1)} (the LTM
              EBITDA above — the same figure the entry price is set on).
            </p>
          </section>
        </main>
      ) : (
        <main className="flex-1 py-8 min-w-0">
          <FullModelView />
        </main>
      )}
    </div>
  )
}
