import { create } from 'zustand'
import { buildDefaultDealInputs } from '../model/defaults'
import type { DealInputs } from '../model/types'
import { decodeDealState, encodeDealState } from './urlCodec'

function readInitialState(): DealInputs {
  if (typeof window === 'undefined') return buildDefaultDealInputs()
  const params = new URLSearchParams(window.location.hash.replace(/^#/, ''))
  const encoded = params.get('d')
  if (encoded) {
    const decoded = decodeDealState(encoded)
    if (decoded) return decoded
  }
  return buildDefaultDealInputs()
}

interface DealStore {
  inputs: DealInputs
  setInputs: (inputs: DealInputs) => void
  updateInputs: (updater: (inputs: DealInputs) => DealInputs) => void
  resetToDefaults: () => void
}

export const useDealStore = create<DealStore>((set) => ({
  inputs: readInitialState(),
  setInputs: (inputs) => set({ inputs }),
  updateInputs: (updater) => set((state) => ({ inputs: updater(state.inputs) })),
  resetToDefaults: () => set({ inputs: buildDefaultDealInputs() }),
}))

// The URL hash is the save file: every state change re-encodes into it so
// the current tab's address bar is always a shareable link to this exact case.
useDealStore.subscribe((state) => {
  if (typeof window === 'undefined') return
  const encoded = encodeDealState(state.inputs)
  const url = new URL(window.location.href)
  url.hash = `d=${encoded}`
  window.history.replaceState(null, '', url.toString())
})
