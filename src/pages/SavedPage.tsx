import { en } from '../i18n/en'

/** Scaffold only — full save/load/compare functionality lands in Part B. */
export function SavedPage() {
  return (
    <main className="flex-1 px-6 py-10">
      <div className="max-w-3xl mx-auto w-full">
        <h1 className="text-3xl">{en.saved.title}</h1>
      </div>
    </main>
  )
}
