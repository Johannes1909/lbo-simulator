import { beforeEach, describe, expect, it } from 'vitest'
import { buildReferenceCaseInputs } from '../../model/presets'
import {
  createSavedCase,
  deleteSavedCase,
  duplicateSavedCase,
  exportAllAsJson,
  getSavedCase,
  importFromJson,
  listSavedCases,
  renameSavedCase,
  updateSavedCase,
} from '../savedCases'

beforeEach(() => {
  window.localStorage.clear()
})

describe('saved cases', () => {
  it('saving and loading a case returns the same deal state', () => {
    const inputs = buildReferenceCaseInputs()
    const result = createSavedCase('Reference', inputs)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const loaded = getSavedCase(result.value.id)
    expect(loaded?.inputs).toEqual(inputs)
  })

  it('records the snapshot metrics at save time', () => {
    const result = createSavedCase('Reference', buildReferenceCaseInputs())
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.snapshotIrr).not.toBeNull()
    expect(result.value.snapshotIrr! * 100).toBeCloseTo(20.2, 1)
    expect(result.value.snapshotMoneyMultiple).toBeCloseTo(2.509, 2)
  })

  it('updating a case overwrites its inputs and refreshes updatedAt without changing the id', () => {
    const created = createSavedCase('Case', buildReferenceCaseInputs())
    if (!created.ok) throw new Error('setup failed')
    const changed = { ...buildReferenceCaseInputs(), transaction: { ...buildReferenceCaseInputs().transaction, entryMultiple: 10 } }
    const updated = updateSavedCase(created.value.id, changed)
    expect(updated.ok).toBe(true)
    if (!updated.ok) return
    expect(updated.value.id).toBe(created.value.id)
    expect(updated.value.inputs.transaction.entryMultiple).toBe(10)
    expect(listSavedCases()).toHaveLength(1)
  })

  it('renaming changes only the name', () => {
    const created = createSavedCase('Old name', buildReferenceCaseInputs())
    if (!created.ok) throw new Error('setup failed')
    const renamed = renameSavedCase(created.value.id, 'New name')
    expect(renamed.ok).toBe(true)
    if (!renamed.ok) return
    expect(renamed.value.name).toBe('New name')
    expect(renamed.value.inputs).toEqual(created.value.inputs)
  })

  it('duplicating creates a second, independent entry', () => {
    const created = createSavedCase('Original', buildReferenceCaseInputs())
    if (!created.ok) throw new Error('setup failed')
    const dup = duplicateSavedCase(created.value.id)
    expect(dup.ok).toBe(true)
    if (!dup.ok) return
    expect(dup.value.id).not.toBe(created.value.id)
    expect(dup.value.name).toBe('Original (copy)')
    expect(listSavedCases()).toHaveLength(2)
  })

  it('deleting removes only the chosen entry', () => {
    const a = createSavedCase('A', buildReferenceCaseInputs())
    const b = createSavedCase('B', buildReferenceCaseInputs())
    if (!a.ok || !b.ok) throw new Error('setup failed')
    const result = deleteSavedCase(a.value.id)
    expect(result.ok).toBe(true)
    const remaining = listSavedCases()
    expect(remaining).toHaveLength(1)
    expect(remaining[0]!.id).toBe(b.value.id)
  })

  it('export then import into an empty store reproduces the same set of cases', () => {
    createSavedCase('A', buildReferenceCaseInputs())
    createSavedCase('B', buildReferenceCaseInputs())
    const exported = exportAllAsJson()

    window.localStorage.clear()
    expect(listSavedCases()).toHaveLength(0)

    const result = importFromJson(exported)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.added).toBe(2)
    expect(result.value.skipped).toBe(0)
    expect(listSavedCases().map((c) => c.name).sort()).toEqual(['A', 'B'])
  })

  it('importing again skips entries that already exist instead of duplicating them', () => {
    createSavedCase('A', buildReferenceCaseInputs())
    const exported = exportAllAsJson()
    const result = importFromJson(exported)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.value.added).toBe(0)
    expect(result.value.skipped).toBe(1)
    expect(listSavedCases()).toHaveLength(1)
  })

  it('import merges with, rather than replacing, the existing set', () => {
    createSavedCase('Existing', buildReferenceCaseInputs())
    const other = createSavedCase('ToImport', buildReferenceCaseInputs())
    if (!other.ok) throw new Error('setup failed')
    const onlyOther = JSON.stringify({ version: 1, cases: [other.value] })

    window.localStorage.clear()
    createSavedCase('Existing', buildReferenceCaseInputs())
    const result = importFromJson(onlyOther)
    expect(result.ok).toBe(true)
    expect(listSavedCases().map((c) => c.name).sort()).toEqual(['Existing', 'ToImport'])
  })

  it('rejects malformed JSON without throwing', () => {
    const result = importFromJson('not json')
    expect(result.ok).toBe(false)
  })
})
