import { runModel } from '../model/engine'
import { debtSizingEbitda } from '../model/sourcesUses'
import type { DealInputs } from '../model/types'

export interface SavedCase {
  id: string
  name: string
  inputs: DealInputs
  createdAt: string
  updatedAt: string
  note?: string
  /** Computed at save time, not live — the whole point is a fast list view without re-running the engine for every saved case on every render. */
  snapshotIrr: number | null
  snapshotMoneyMultiple: number | null
  snapshotEntryLeverage: number
}

const STORAGE_KEY = 'lbo-simulator-saved-cases'
const SCHEMA_VERSION = 1

interface StorageFile {
  version: number
  cases: SavedCase[]
}

export type StorageResult<T> = { ok: true; value: T } | { ok: false; error: string }

function emptyFile(): StorageFile {
  return { version: SCHEMA_VERSION, cases: [] }
}

/**
 * Encapsulated on purpose: everything else in the app talks to saved cases
 * through the functions below, never to localStorage directly — so a later
 * move to a backend only touches this file. The version number exists so a
 * future schema change can migrate old entries instead of discarding them.
 */
function readFile(): StorageFile {
  if (typeof window === 'undefined') return emptyFile()
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return emptyFile()
    const parsed = JSON.parse(raw) as Partial<StorageFile>
    if (!parsed || !Array.isArray(parsed.cases)) return emptyFile()
    // Only schema v1 exists today; an unrecognized version is treated as
    // empty rather than risking a crash on an unknown shape.
    if (parsed.version !== SCHEMA_VERSION) return emptyFile()
    return { version: SCHEMA_VERSION, cases: parsed.cases }
  } catch {
    return emptyFile()
  }
}

function writeFile(file: StorageFile): StorageResult<void> {
  if (typeof window === 'undefined') return { ok: true, value: undefined }
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(file))
    return { ok: true, value: undefined }
  } catch {
    return { ok: false, error: 'Could not save — browser storage is full or unavailable.' }
  }
}

function snapshotMetrics(inputs: DealInputs) {
  const output = runModel(inputs)
  const ebitda = debtSizingEbitda(inputs)
  return {
    snapshotIrr: output.returns.irr,
    snapshotMoneyMultiple: output.returns.moneyMultiple,
    snapshotEntryLeverage: ebitda > 0 ? output.sourcesUses.sourcesTrancheTotal / ebitda : 0,
  }
}

function newId(): string {
  return `case-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

export function listSavedCases(): SavedCase[] {
  return [...readFile().cases]
}

export function getSavedCase(id: string): SavedCase | undefined {
  return readFile().cases.find((c) => c.id === id)
}

export function createSavedCase(name: string, inputs: DealInputs, note?: string): StorageResult<SavedCase> {
  const file = readFile()
  const now = new Date().toISOString()
  const entry: SavedCase = {
    id: newId(),
    name,
    inputs,
    createdAt: now,
    updatedAt: now,
    note,
    ...snapshotMetrics(inputs),
  }
  file.cases.push(entry)
  const result = writeFile(file)
  return result.ok ? { ok: true, value: entry } : result
}

export function updateSavedCase(id: string, inputs: DealInputs): StorageResult<SavedCase> {
  const file = readFile()
  const idx = file.cases.findIndex((c) => c.id === id)
  if (idx === -1) return { ok: false, error: 'This case no longer exists — it may have been deleted elsewhere.' }
  const updated: SavedCase = {
    ...file.cases[idx]!,
    inputs,
    updatedAt: new Date().toISOString(),
    ...snapshotMetrics(inputs),
  }
  file.cases[idx] = updated
  const result = writeFile(file)
  return result.ok ? { ok: true, value: updated } : result
}

export function renameSavedCase(id: string, name: string): StorageResult<SavedCase> {
  const file = readFile()
  const idx = file.cases.findIndex((c) => c.id === id)
  if (idx === -1) return { ok: false, error: 'This case no longer exists.' }
  const updated = { ...file.cases[idx]!, name, updatedAt: new Date().toISOString() }
  file.cases[idx] = updated
  const result = writeFile(file)
  return result.ok ? { ok: true, value: updated } : result
}

export function duplicateSavedCase(id: string): StorageResult<SavedCase> {
  const source = getSavedCase(id)
  if (!source) return { ok: false, error: 'This case no longer exists.' }
  return createSavedCase(`${source.name} (copy)`, source.inputs, source.note)
}

export function deleteSavedCase(id: string): StorageResult<void> {
  const file = readFile()
  file.cases = file.cases.filter((c) => c.id !== id)
  return writeFile(file)
}

export function exportAllAsJson(): string {
  return JSON.stringify(readFile(), null, 2)
}

/** Merges into the existing set by id — never overwrites an entry that's already there. */
export function importFromJson(json: string): StorageResult<{ added: number; skipped: number }> {
  let parsed: unknown
  try {
    parsed = JSON.parse(json)
  } catch {
    return { ok: false, error: 'That file is not valid JSON.' }
  }
  const incomingCases = (parsed as Partial<StorageFile> | null)?.cases
  if (!Array.isArray(incomingCases)) {
    return { ok: false, error: 'That file does not look like an exported case list.' }
  }

  const file = readFile()
  const existingIds = new Set(file.cases.map((c) => c.id))
  let added = 0
  let skipped = 0
  for (const incoming of incomingCases as SavedCase[]) {
    if (!incoming?.id || existingIds.has(incoming.id)) {
      skipped++
      continue
    }
    file.cases.push(incoming)
    existingIds.add(incoming.id)
    added++
  }

  const result = writeFile(file)
  return result.ok ? { ok: true, value: { added, skipped } } : result
}
