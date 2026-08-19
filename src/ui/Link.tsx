import type { AnchorHTMLAttributes, MouseEvent, ReactNode } from 'react'
import { useRouteStore } from '../state/routeStore'

interface LinkProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> {
  to: string
  children: ReactNode
}

/** A real <a> (so open-in-new-tab, middle-click, screen readers all work), intercepted for same-tab navigation. */
export function Link({ to, children, onClick, ...rest }: LinkProps) {
  const navigate = useRouteStore((s) => s.navigate)

  function handleClick(e: MouseEvent<HTMLAnchorElement>) {
    if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) {
      return
    }
    e.preventDefault()
    navigate(to)
    onClick?.(e)
  }

  return (
    <a href={to} onClick={handleClick} {...rest}>
      {children}
    </a>
  )
}
