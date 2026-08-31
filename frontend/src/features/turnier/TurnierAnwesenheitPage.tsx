import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { AnwesenheitEditor } from './AnwesenheitEditor'
import {
  berechneTurnierStatus,
  getTurnier,
  listSpiele,
  type Spiel,
  type Turnier,
} from './turnierApi'

export function TurnierAnwesenheitPage() {
  const { turnierId } = useParams<{ turnierId: string }>()
  const [turnier, setTurnier] = useState<Turnier | null>(null)
  const [spiele, setSpiele] = useState<Spiel[]>([])
  const [ladeFehler, setLadeFehler] = useState<string | null>(null)

  async function laden() {
    if (!turnierId) return
    try {
      const [t, s] = await Promise.all([getTurnier(turnierId), listSpiele(turnierId)])
      setTurnier(t)
      setSpiele(s)
      setLadeFehler(null)
    } catch {
      setLadeFehler('Keine Verbindung – bitte Seite neu laden.')
    }
  }

  useEffect(() => {
    laden()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turnierId])

  if (ladeFehler)
    return <p className="text-sm text-red-600 dark:text-red-400">{ladeFehler}</p>
  if (!turnier)
    return <p className="text-sm text-slate-500 dark:text-slate-400">Lädt…</p>

  // FR-27a: Turnier-Anwesenheit ist nur bis zum Turnier-Abschluss ueber
  // diese Seite editierbar; danach nur noch im Admin-Bereich (bewusste
  // Ausnahme).
  const gesperrt = berechneTurnierStatus(spiele) === 'beendet'

  return (
    <div>
      <Link
        to={`/turniere/${turnier.id}`}
        className="mb-4 inline-block text-sm text-slate-500 dark:text-slate-400"
      >
        ← {turnier.bezeichnung}
      </Link>
      <h1 className="mb-1 text-lg font-semibold text-slate-900 dark:text-slate-100">
        Anwesenheit
      </h1>
      <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
        Gilt für alle Spiele dieses Turniers und kann bis zum Turnierabschluss
        jederzeit angepasst werden.
      </p>

      {gesperrt && (
        <p className="mb-4 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
          Turnier ist beendet – Anwesenheit kann nur noch im{' '}
          <Link
            to={`/turniere/${turnier.id}/admin`}
            className="font-medium underline"
          >
            Admin-Bereich
          </Link>{' '}
          korrigiert werden.
        </p>
      )}

      <AnwesenheitEditor turnierId={turnier.id} gesperrt={gesperrt} />
    </div>
  )
}
