import { create } from 'zustand'

/** Which saved case (if any) the current deal state was loaded from or last saved as — tracked separately from the deal state itself, so it survives independently of what's being edited. */
interface OpenedCaseStore {
  openedCaseId: string | null
  openedCaseName: string | null
  setOpened: (id: string, name: string) => void
  clearOpened: () => void
}

export const useOpenedCaseStore = create<OpenedCaseStore>((set) => ({
  openedCaseId: null,
  openedCaseName: null,
  setOpened: (id, name) => set({ openedCaseId: id, openedCaseName: name }),
  clearOpened: () => set({ openedCaseId: null, openedCaseName: null }),
}))
