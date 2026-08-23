import { useState } from 'react'
import { en } from '../i18n/en'
import { createSavedCase, getSavedCase, updateSavedCase } from '../state/savedCases'
import { useDealStore } from '../state/store'
import { useOpenedCaseStore } from '../state/useOpenedCase'

/**
 * "Save" overwrites the currently opened case (or, with nothing open yet,
 * behaves like "Save as new"); "Save as new" always creates a fresh entry.
 * Both only show up next to the opened case's name once something is open,
 * matching the brief.
 */
export function SaveControls() {
  const inputs = useDealStore((s) => s.inputs)
  const openedCaseId = useOpenedCaseStore((s) => s.openedCaseId)
  const openedCaseName = useOpenedCaseStore((s) => s.openedCaseName)
  const setOpened = useOpenedCaseStore((s) => s.setOpened)
  const [error, setError] = useState<string | null>(null)

  const storedCase = openedCaseId ? getSavedCase(openedCaseId) : undefined
  const hasUnsavedChanges = openedCaseId !== null && (!storedCase || JSON.stringify(storedCase.inputs) !== JSON.stringify(inputs))

  function handleSave() {
    setError(null)
    if (openedCaseId) {
      const result = updateSavedCase(openedCaseId, inputs)
      if (!result.ok) setError(result.error)
      return
    }
    const name = window.prompt(en.saved.namePrompt)
    if (!name) return
    const result = createSavedCase(name, inputs)
    if (result.ok) setOpened(result.value.id, result.value.name)
    else setError(result.error)
  }

  function handleSaveAsNew() {
    setError(null)
    const name = window.prompt(en.saved.namePrompt, openedCaseName ? `${openedCaseName} (copy)` : undefined)
    if (!name) return
    const result = createSavedCase(name, inputs)
    if (result.ok) setOpened(result.value.id, result.value.name)
    else setError(result.error)
  }

  return (
    <div className="flex items-center gap-2">
      {openedCaseName && (
        <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          {openedCaseName}
          {hasUnsavedChanges && (
            <span title={en.saved.unsavedChanges} style={{ color: 'var(--color-brass)' }}>
              {' '}
              •
            </span>
          )}
        </span>
      )}
      <button
        type="button"
        onClick={handleSave}
        className="text-sm border px-3 py-1.5 cursor-pointer"
        style={{ borderColor: 'var(--color-brass)', color: 'var(--color-brass)' }}
      >
        {en.saved.save}
      </button>
      {openedCaseId && (
        <button
          type="button"
          onClick={handleSaveAsNew}
          className="text-sm underline cursor-pointer"
          style={{ color: 'var(--color-text-muted)' }}
        >
          {en.saved.saveAsNew}
        </button>
      )}
      {error && (
        <span className="text-xs" style={{ color: 'var(--color-warning)' }}>
          {error}
        </span>
      )}
    </div>
  )
}
