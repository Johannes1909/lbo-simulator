import { useRef, useState } from 'react'
import { en } from '../i18n/en'
import { formatMultiple, formatPercent } from '../ui/format'
import { Link } from '../ui/Link'
import {
  deleteSavedCase,
  duplicateSavedCase,
  exportAllAsJson,
  importFromJson,
  listSavedCases,
  renameSavedCase,
  type SavedCase,
} from '../state/savedCases'
import { useDealStore } from '../state/store'
import { useOpenedCaseStore } from '../state/useOpenedCase'
import { encodeDealState } from '../state/urlCodec'
import { useRouteStore } from '../state/routeStore'

type SortKey = 'name' | 'date'

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

export function SavedPage() {
  const [cases, setCases] = useState<SavedCase[]>(() => listSavedCases())
  const [sortKey, setSortKey] = useState<SortKey>('date')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [message, setMessage] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const setInputs = useDealStore((s) => s.setInputs)
  const setOpened = useOpenedCaseStore((s) => s.setOpened)
  const navigate = useRouteStore((s) => s.navigate)

  function refresh() {
    setCases(listSavedCases())
  }

  const sorted = [...cases].sort((a, b) =>
    sortKey === 'name' ? a.name.localeCompare(b.name) : b.updatedAt.localeCompare(a.updatedAt),
  )

  function handleOpen(c: SavedCase) {
    setInputs(c.inputs)
    setOpened(c.id, c.name)
    navigate('/')
  }

  function handleRename(c: SavedCase) {
    const name = window.prompt(en.saved.namePrompt, c.name)
    if (!name || name === c.name) return
    const result = renameSavedCase(c.id, name)
    if (result.ok) refresh()
    else setMessage(result.error)
  }

  function handleDuplicate(c: SavedCase) {
    const result = duplicateSavedCase(c.id)
    if (result.ok) refresh()
    else setMessage(result.error)
  }

  function handleDelete(c: SavedCase) {
    if (!window.confirm(en.saved.deleteConfirm)) return
    const result = deleteSavedCase(c.id)
    if (result.ok) {
      setSelected((prev) => {
        const next = new Set(prev)
        next.delete(c.id)
        return next
      })
      refresh()
    } else {
      setMessage(result.error)
    }
  }

  async function handleCopyLink(c: SavedCase) {
    const encoded = encodeDealState(c.inputs)
    const url = new URL(window.location.href)
    url.pathname = '/'
    url.hash = `d=${encoded}`
    try {
      await navigator.clipboard.writeText(url.toString())
      setMessage(en.share.linkCopied)
    } catch {
      setMessage(en.share.copyFailed)
    }
  }

  function toggleSelected(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function handleExportAll() {
    const json = exportAllAsJson()
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'lbo-simulator-cases.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  function handleImportClick() {
    fileInputRef.current?.click()
  }

  async function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const text = await file.text()
    const result = importFromJson(text)
    if (result.ok) {
      setMessage(en.saved.importResult(result.value.added, result.value.skipped))
      refresh()
    } else {
      setMessage(result.error)
    }
  }

  const selectedCases = sorted.filter((c) => selected.has(c.id))

  return (
    <main className="flex-1 px-6 py-10">
      <div className="max-w-4xl mx-auto w-full flex flex-col gap-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h1 className="text-3xl">{en.saved.title}</h1>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleExportAll}
              className="text-sm border px-3 py-1.5 cursor-pointer"
              style={{ borderColor: 'var(--color-border-strong)', color: 'var(--color-text-muted)' }}
            >
              {en.saved.exportAll}
            </button>
            <button
              type="button"
              onClick={handleImportClick}
              className="text-sm border px-3 py-1.5 cursor-pointer"
              style={{ borderColor: 'var(--color-border-strong)', color: 'var(--color-text-muted)' }}
            >
              {en.saved.importFile}
            </button>
            <input ref={fileInputRef} type="file" accept="application/json" className="hidden" onChange={handleImportFile} />
          </div>
        </div>

        {message && (
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
            {message}
          </p>
        )}

        {sorted.length === 0 ? (
          <p style={{ color: 'var(--color-text-muted)' }}>{en.saved.emptyState}</p>
        ) : (
          <>
            <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--color-text-muted)' }}>
              <span>Sort by</span>
              {(['date', 'name'] as const).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setSortKey(k)}
                  className="underline cursor-pointer"
                  style={{ color: sortKey === k ? 'var(--color-brass)' : 'var(--color-text-muted)' }}
                >
                  {k === 'date' ? en.saved.sortByDate : en.saved.sortByName}
                </button>
              ))}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse min-w-[640px]">
                <thead>
                  <tr className="border-b" style={{ borderColor: 'var(--color-border-strong)' }}>
                    <th className="w-8"></th>
                    <th className="text-left py-2 font-normal" style={{ color: 'var(--color-text-muted)' }}>
                      {en.saved.columnName}
                    </th>
                    <th className="text-left py-2 font-normal" style={{ color: 'var(--color-text-muted)' }}>
                      {en.saved.columnUpdated}
                    </th>
                    <th className="text-right py-2 font-normal" style={{ color: 'var(--color-text-muted)' }}>
                      {en.saved.columnIrr}
                    </th>
                    <th className="text-right py-2 font-normal" style={{ color: 'var(--color-text-muted)' }}>
                      {en.saved.columnMultiple}
                    </th>
                    <th className="text-right py-2 font-normal" style={{ color: 'var(--color-text-muted)' }}>
                      {en.saved.columnLeverage}
                    </th>
                    <th className="text-right py-2 font-normal" style={{ color: 'var(--color-text-muted)' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((c) => (
                    <tr key={c.id} className="border-b" style={{ borderColor: 'var(--color-border)' }}>
                      <td className="py-2">
                        <input
                          type="checkbox"
                          checked={selected.has(c.id)}
                          onChange={() => toggleSelected(c.id)}
                          aria-label={`Select ${c.name} for comparison`}
                          className="accent-[var(--color-brass)] w-4 h-4"
                        />
                      </td>
                      <td className="py-2">{c.name}</td>
                      <td className="py-2 font-figures text-xs" style={{ color: 'var(--color-text-muted)' }}>
                        {formatDate(c.updatedAt)}
                      </td>
                      <td className="py-2 text-right font-figures">
                        {c.snapshotIrr !== null ? formatPercent(c.snapshotIrr * 100, 1) : '—'}
                      </td>
                      <td className="py-2 text-right font-figures">
                        {c.snapshotMoneyMultiple !== null ? formatMultiple(c.snapshotMoneyMultiple) : '—'}
                      </td>
                      <td className="py-2 text-right font-figures">{formatMultiple(c.snapshotEntryLeverage)}</td>
                      <td className="py-2 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleOpen(c)}
                          className="text-xs underline cursor-pointer mr-3"
                          style={{ color: 'var(--color-brass)' }}
                        >
                          {en.saved.open}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRename(c)}
                          className="text-xs underline cursor-pointer mr-3"
                          style={{ color: 'var(--color-text-muted)' }}
                        >
                          {en.saved.rename}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDuplicate(c)}
                          className="text-xs underline cursor-pointer mr-3"
                          style={{ color: 'var(--color-text-muted)' }}
                        >
                          {en.saved.duplicate}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCopyLink(c)}
                          className="text-xs underline cursor-pointer mr-3"
                          style={{ color: 'var(--color-text-muted)' }}
                        >
                          {en.saved.copyLink}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(c)}
                          className="text-xs underline cursor-pointer"
                          style={{ color: 'var(--color-warning)' }}
                        >
                          {en.saved.delete}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {selectedCases.length > 1 && (
              <section>
                <h2 className="text-lg mb-3">{en.saved.compareSelected}</h2>
                <div className="overflow-x-auto">
                  <table className="text-sm border-collapse w-full">
                    <thead>
                      <tr className="border-b" style={{ borderColor: 'var(--color-border-strong)' }}>
                        <th className="text-left py-1 font-normal" style={{ color: 'var(--color-text-muted)' }}></th>
                        {selectedCases.map((c) => (
                          <th key={c.id} className="text-right py-1 font-normal px-3" style={{ color: 'var(--color-heading)' }}>
                            {c.name}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="font-figures">
                      <tr className="border-b" style={{ borderColor: 'var(--color-border)' }}>
                        <td className="py-1" style={{ fontFamily: 'var(--font-sans)', color: 'var(--color-text)' }}>
                          IRR
                        </td>
                        {selectedCases.map((c) => (
                          <td key={c.id} className="text-right py-1 px-3">
                            {c.snapshotIrr !== null ? formatPercent(c.snapshotIrr * 100, 1) : '—'}
                          </td>
                        ))}
                      </tr>
                      <tr className="border-b" style={{ borderColor: 'var(--color-border)' }}>
                        <td className="py-1" style={{ fontFamily: 'var(--font-sans)', color: 'var(--color-text)' }}>
                          Money multiple
                        </td>
                        {selectedCases.map((c) => (
                          <td key={c.id} className="text-right py-1 px-3">
                            {c.snapshotMoneyMultiple !== null ? formatMultiple(c.snapshotMoneyMultiple) : '—'}
                          </td>
                        ))}
                      </tr>
                      <tr className="border-b" style={{ borderColor: 'var(--color-border)' }}>
                        <td className="py-1" style={{ fontFamily: 'var(--font-sans)', color: 'var(--color-text)' }}>
                          Entry leverage
                        </td>
                        {selectedCases.map((c) => (
                          <td key={c.id} className="text-right py-1 px-3">
                            {formatMultiple(c.snapshotEntryLeverage)}
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </section>
            )}
          </>
        )}

        <p className="text-sm mt-4" style={{ color: 'var(--color-text-muted)' }}>
          Saved cases live in this browser only — on another device, or after clearing browser storage, they
          won't be there. Copy link or Export all if you need a case somewhere else. See also{' '}
          <Link to="/" className="underline">
            the calculator
          </Link>
          .
        </p>
      </div>
    </main>
  )
}
