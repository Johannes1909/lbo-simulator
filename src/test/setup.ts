import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

// Unmounts components rendered by React Testing Library after every test —
// without this, each render() call in a suite piles up in the same jsdom
// document and role/text queries start matching more than one element.
afterEach(() => {
  cleanup()
})
