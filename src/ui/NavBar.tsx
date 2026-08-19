import { useState } from 'react'
import { en } from '../i18n/en'
import { navItems } from '../nav/navConfig'
import { useRouteStore } from '../state/routeStore'
import { Link } from './Link'
import { ThemeToggle } from './ThemeToggle'

const NAVBAR_HEIGHT = 'h-14' // fixed height so the mobile dropdown doesn't reflow the sticky bar under it

export function NavBar() {
  const path = useRouteStore((s) => s.path)
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <nav
      className={`sticky top-0 z-30 ${NAVBAR_HEIGHT} flex items-center justify-between px-6 border-b relative`}
      style={{ background: 'var(--color-bg-panel)', borderColor: 'var(--color-border)' }}
      aria-label="Main"
    >
      <Link to="/" className="text-sm tracking-wide" style={{ color: 'var(--color-heading)' }}>
        {en.nav.brand}
      </Link>

      <div className="hidden sm:flex items-center gap-6">
        {navItems.map((item) => (
          <Link
            key={item.id}
            to={item.path}
            aria-current={path === item.path ? 'page' : undefined}
            className="text-sm"
            style={{ color: path === item.path ? 'var(--color-brass)' : 'var(--color-text-muted)' }}
          >
            {item.label}
          </Link>
        ))}
        <ThemeToggle />
      </div>

      <button
        type="button"
        className="sm:hidden border px-2 py-1 text-sm cursor-pointer"
        style={{ borderColor: 'var(--color-border-strong)', color: 'var(--color-text-muted)' }}
        aria-expanded={mobileOpen}
        aria-controls="mobile-nav-menu"
        onClick={() => setMobileOpen((v) => !v)}
      >
        {en.nav.menuToggle}
      </button>

      {mobileOpen && (
        <div
          id="mobile-nav-menu"
          className="sm:hidden absolute left-0 right-0 border-b flex flex-col p-4 gap-3"
          style={{ background: 'var(--color-bg-panel)', borderColor: 'var(--color-border)', top: '100%' }}
        >
          {navItems.map((item) => (
            <Link
              key={item.id}
              to={item.path}
              onClick={() => setMobileOpen(false)}
              aria-current={path === item.path ? 'page' : undefined}
              className="text-sm"
              style={{ color: path === item.path ? 'var(--color-brass)' : 'var(--color-text)' }}
            >
              {item.label}
            </Link>
          ))}
          <div className="pt-1">
            <ThemeToggle />
          </div>
        </div>
      )}
    </nav>
  )
}
