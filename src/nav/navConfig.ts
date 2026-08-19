export interface NavItem {
  id: string
  label: string
  path: string
}

/**
 * Single source of truth for the site navigation. A new entry is one line
 * here — NavBar, active-state highlighting and mobile menu all read from
 * this list, nothing else needs to change.
 */
export const navItems: NavItem[] = [
  { id: 'calculator', label: 'Calculator', path: '/' },
  { id: 'saved', label: 'Saved', path: '/saved' },
  { id: 'learn', label: 'How it works', path: '/learn' },
  { id: 'methodology', label: 'Methodology', path: '/methodology' },
]
