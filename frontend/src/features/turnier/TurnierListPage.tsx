import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { createTurnier, listTurniere, type Turnier } from './turnierApi'

export function TurnierListPage() {
  const [turniere, setTurniere] = useState<Turnier[]>([])
  const [datum, setDatum] = useState('')
  const [bezeichnung, setBezeichnung] = useState('')
  const [istTest, setIstTest] = useState(false)
  const [fehler, setFehler] = useState<string | null>(null)

  async function laden() {
    try {
      setTurniere(await listTurniere())
    } catch {
      setFehler('Keine Verbindung – bitte Seite neu laden.')
    }
  }

  useEffect(() => {
    laden()
  }, [])

  async function handleAnlegen(event: FormEvent) {
    event.preventDefault()
    // UC-03/E2: Datum ist Pflichtfeld.
    if (!datum || bezeichnung.trim().length === 0) {
      setFehler('Bitte Datum und Bezeichnung angeben.')
      return
    }
    try {
      await createTurnier(datum, bezeichnung.trim(), istTest)
      setDatum('')
      setBezeichnung('')
      setIstTest(false)
      setFehler(null)
      await laden()
    } catch {
      setFehler('Keine Verbindung – bitte erneut versuchen.')
    }
  }

  return (
    <div>
      <h1 className="mb-4 text-lg font-semibold text-slate-900 dark:text-slate-100">
        Turniere
      </h1>

      <form
        onSubmit={handleAnlegen}
        className="mb-6 flex flex-wrap items-start gap-2 rounded-lg bg-white p-4 shadow-sm dark:bg-slate-800"
      >
        <input
          type="date"
          value={datum}
          onChange={(e) => setDatum(e.target.value)}
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-base text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
        />
        <input
          type="text"
          placeholder="Bezeichnung"
          value={bezeichnung}
          onChange={(e) => setBezeichnung(e.target.value)}
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-base text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
        />
        <label className="flex items-center gap-2 px-1 py-2 text-sm text-slate-700 dark:text-slate-300">
          <input
            type="checkbox"
            checked={istTest}
            onChange={(e) => setIstTest(e.target.checked)}
            className="h-5 w-5"
          />
          Test-Turnier
        </label>
        <button
          type="submit"
          className="rounded-md bg-slate-900 px-4 py-2 text-base font-medium text-white"
        >
          Turnier anlegen
        </button>
        {fehler && (
          <p className="w-full text-sm text-red-600 dark:text-red-400">{fehler}</p>
        )}
      </form>

      <ul className="divide-y divide-slate-200 rounded-lg bg-white shadow-sm dark:divide-slate-700 dark:bg-slate-800">
        {turniere.map((t) => (
          <li key={t.id}>
            <Link
              to={`/turniere/${t.id}`}
              className="flex items-center justify-between px-4 py-3 text-slate-900 hover:bg-slate-50 dark:text-slate-100 dark:hover:bg-slate-700"
            >
              <span>
                {t.bezeichnung}
                {t.ist_test && (
                  <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                    Test
                  </span>
                )}
              </span>
              <span className="text-sm text-slate-500 dark:text-slate-400">
                {t.datum}
              </span>
            </Link>
          </li>
        ))}
        {turniere.length === 0 && (
          <li className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">
            Noch keine Turniere angelegt.
          </li>
        )}
      </ul>
    </div>
  )
}
