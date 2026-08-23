import { useState } from 'react'
import { en } from '../i18n/en'
import {
  buildEuropeanMidMarketInputs,
  buildPresetInputs,
  buildReferenceCaseInputs,
  PRESETS,
  type PresetId,
} from '../model/presets'
import type { DealInputs } from '../model/types'
import { getSavedCase } from '../state/savedCases'
import { useDealStore } from '../state/store'
import { useOpenedCaseStore } from '../state/useOpenedCase'

function detectInitialPreset(inputs: DealInputs): PresetId {
  const asJson = JSON.stringify(inputs)
  if (asJson === JSON.stringify(buildReferenceCaseInputs())) return 'referenceCase'
  if (asJson === JSON.stringify(buildEuropeanMidMarketInputs())) return 'europeanMidMarket'
  return 'referenceCase'
}

/**
 * Loading a preset replaces the entire deal state. If the current state has
 * drifted from the preset it was last loaded from (any slider touched,
 * any tranche edited), switching asks first — there's no save system yet
 * to fall back on, so a silent overwrite would just lose the edits.
 */
export function PresetSelector() {
  const inputs = useDealStore((s) => s.inputs)
  const setInputs = useDealStore((s) => s.setInputs)
  const openedCaseId = useOpenedCaseStore((s) => s.openedCaseId)
  const clearOpened = useOpenedCaseStore((s) => s.clearOpened)
  const [currentPreset, setCurrentPreset] = useState<PresetId>(() => detectInitialPreset(inputs))

  function handleChange(id: PresetId) {
    if (id === currentPreset) return
    // A saved case, if one is open, is the more authoritative "last known
    // good state" to diff against than whichever preset was last loaded.
    const openedCase = openedCaseId ? getSavedCase(openedCaseId) : undefined
    const referenceInputs = openedCase ? openedCase.inputs : buildPresetInputs(currentPreset)
    const hasUnsavedChanges = JSON.stringify(inputs) !== JSON.stringify(referenceInputs)
    if (hasUnsavedChanges && !window.confirm(en.presets.confirmOverwrite)) {
      return
    }
    setInputs(buildPresetInputs(id))
    setCurrentPreset(id)
    clearOpened()
  }

  return (
    <label className="flex items-center gap-2 text-sm">
      <span style={{ color: 'var(--color-text-muted)' }}>{en.presets.label}</span>
      <select
        value={currentPreset}
        onChange={(e) => handleChange(e.target.value as PresetId)}
        aria-label={en.presets.label}
        className="border px-2 py-1.5 bg-transparent cursor-pointer"
        style={{ borderColor: 'var(--color-border-strong)', color: 'var(--color-text)' }}
      >
        {PRESETS.map((p) => (
          <option key={p.id} value={p.id} style={{ color: '#000' }}>
            {p.label}
          </option>
        ))}
      </select>
    </label>
  )
}
