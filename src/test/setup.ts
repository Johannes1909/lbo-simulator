import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

// Unmounts components rendered by React Testing Library after every test —
// without this, each render() call in a suite piles up in the same jsdom
// document and role/text queries start matching more than one element.
afterEach(() => {
  cleanup()
})

// jsdom doesn't implement matchMedia. AnimatedNumber reads it (reduced-motion
// check) on mount, so any test rendering a component with a number that
// animates (ResultBar, Tombstone) would otherwise crash regardless of what
// it's actually testing. Reports "no preference" — deterministic for tests.
if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })
}
