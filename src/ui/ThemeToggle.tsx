import { en } from '../i18n/en'
import { useTheme } from '../state/useTheme'

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-pressed={theme === 'dark'}
      className="border px-3 py-1.5 text-sm cursor-pointer"
      style={{ borderColor: 'var(--color-border-strong)', color: 'var(--color-text-muted)' }}
    >
      {theme === 'dark' ? en.theme.switchToLight : en.theme.switchToDark}
    </button>
  )
}
