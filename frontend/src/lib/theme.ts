const STORAGE_KEY = 'theme'

export type Theme = 'light' | 'dark'

export function ermittleTheme(): Theme {
  const gespeichert = localStorage.getItem(STORAGE_KEY)
  if (gespeichert === 'light' || gespeichert === 'dark') return gespeichert
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light'
}

export function setzeTheme(theme: Theme): void {
  document.documentElement.classList.toggle('dark', theme === 'dark')
  localStorage.setItem(STORAGE_KEY, theme)
}
