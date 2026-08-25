import type { ReactNode } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../features/auth/AuthContext'

const navItemClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-md px-3 py-2 text-sm font-medium ${
    isActive ? 'bg-slate-900 text-white' : 'text-slate-700 hover:bg-slate-100'
  }`

export function Layout({ children }: { children: ReactNode }) {
  const { signOut } = useAuth()
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut()
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <nav className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
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
        <button
          onClick={handleSignOut}
          className="rounded-md px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
        >
          Abmelden
        </button>
      </nav>
      <main className="mx-auto max-w-2xl px-4 py-6">{children}</main>
    </div>
  )
}
