import { create } from 'zustand'

/**
 * Deliberately minimal: four static top-level paths, no params, no nested
 * routes. A hand-rolled pathname store is ~20 lines and avoids a router
 * dependency for something this simple; reaches for Zustand (already a
 * dependency) rather than React Context so any component can subscribe
 * without a provider wrapper.
 */
interface RouteStore {
  path: string
  navigate: (to: string) => void
}

function currentPath(): string {
  return typeof window === 'undefined' ? '/' : window.location.pathname
}

export const useRouteStore = create<RouteStore>((set) => ({
  path: currentPath(),
  navigate: (to) => {
    if (typeof window !== 'undefined' && to !== window.location.pathname) {
      window.history.pushState(null, '', to)
    }
    set({ path: to })
  },
}))

if (typeof window !== 'undefined') {
  window.addEventListener('popstate', () => {
    useRouteStore.setState({ path: currentPath() })
  })
}
