import { useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from './AuthContext'

export function LoginPage() {
  const { session, signIn } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [usernameError, setUsernameError] = useState(false)
  const [passwordError, setPasswordError] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (session) {
    return <Navigate to="/" replace />
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setFormError(null)

    // UC-01/E3: leere Pflichtfelder verhindern das Absenden.
    const missingUsername = username.trim().length === 0
    const missingPassword = password.trim().length === 0
    setUsernameError(missingUsername)
    setPasswordError(missingPassword)
    if (missingUsername || missingPassword) {
      return
    }

    setSubmitting(true)
    const { error } = await signIn(username.trim(), password)
    setSubmitting(false)
    if (error) {
      setFormError(error)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-lg bg-white p-6 shadow-sm"
      >
        <h1 className="mb-6 text-xl font-semibold text-slate-900">
          Spielzeit-Rotation
        </h1>

        <label className="mb-1 block text-sm font-medium text-slate-700">
          Benutzername
        </label>
        <input
          type="text"
          autoComplete="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className={`mb-3 w-full rounded-md border px-3 py-2 text-base ${
            usernameError ? 'border-red-500' : 'border-slate-300'
          }`}
        />

        <label className="mb-1 block text-sm font-medium text-slate-700">
          Passwort
        </label>
        <input
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={`mb-4 w-full rounded-md border px-3 py-2 text-base ${
            passwordError ? 'border-red-500' : 'border-slate-300'
          }`}
        />

        {formError && (
          <p className="mb-4 text-sm text-red-600">{formError}</p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-md bg-slate-900 py-2 text-base font-medium text-white disabled:opacity-50"
        >
          {submitting ? 'Anmelden…' : 'Anmelden'}
        </button>
      </form>
    </div>
  )
}
