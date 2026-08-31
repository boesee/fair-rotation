import { useState, type ReactNode } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../features/auth/AuthContext'
import { ermittleTheme, setzeTheme, type Theme } from '../lib/theme'

const navItemClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-md px-3 py-2 text-sm font-medium ${
    isActive
      ? 'bg-slate-900 text-white'
      : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
  }`

export function Layout({ children }: { children: ReactNode }) {
  const { signOut } = useAuth()
  const navigate = useNavigate()
  const [theme, setTheme] = useState<Theme>(ermittleTheme)

  async function handleSignOut() {
    await signOut()
    navigate('/login', { replace: true })
  }

  function toggleTheme() {
    const neu: Theme = theme === 'dark' ? 'light' : 'dark'
    setzeTheme(neu)
    setTheme(neu)
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <nav className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-800">
        <div className="flex gap-1">
          <NavLink to="/kader" className={navItemClass}>
            Kader
          </NavLink>
          <NavLink to="/turniere" className={navItemClass}>
            Turniere
          </NavLink>
          <NavLink to="/statistik" className={navItemClass}>
            Statistik
          </NavLink>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={toggleTheme}
            title="Darstellung umschalten"
            className="rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
          <button
            onClick={handleSignOut}
            className="rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Abmelden
          </button>
        </div>
      </nav>
      <main className="mx-auto max-w-2xl px-4 py-6">{children}</main>
    </div>
  )
}
