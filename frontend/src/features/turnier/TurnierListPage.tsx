import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { createTurnier, listTurniere, type Turnier } from './turnierApi'

export function TurnierListPage() {
  const [turniere, setTurniere] = useState<Turnier[]>([])
  const [datum, setDatum] = useState('')
  const [bezeichnung, setBezeichnung] = useState('')
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
      await createTurnier(datum, bezeichnung.trim())
      setDatum('')
      setBezeichnung('')
      setFehler(null)
      await laden()
    } catch {
      setFehler('Keine Verbindung – bitte erneut versuchen.')
    }
  }

  return (
    <div>
      <h1 className="mb-4 text-lg font-semibold text-slate-900">Turniere</h1>

      <form
        onSubmit={handleAnlegen}
        className="mb-6 flex flex-wrap items-start gap-2 rounded-lg bg-white p-4 shadow-sm"
      >
        <input
          type="date"
          value={datum}
          onChange={(e) => setDatum(e.target.value)}
          className="rounded-md border border-slate-300 px-3 py-2 text-base"
        />
        <input
          type="text"
          placeholder="Bezeichnung"
          value={bezeichnung}
          onChange={(e) => setBezeichnung(e.target.value)}
          className="rounded-md border border-slate-300 px-3 py-2 text-base"
        />
        <button
          type="submit"
          className="rounded-md bg-slate-900 px-4 py-2 text-base font-medium text-white"
        >
          Turnier anlegen
        </button>
        {fehler && <p className="w-full text-sm text-red-600">{fehler}</p>}
      </form>

      <ul className="divide-y divide-slate-200 rounded-lg bg-white shadow-sm">
        {turniere.map((t) => (
          <li key={t.id}>
            <Link
              to={`/turniere/${t.id}`}
              className="flex items-center justify-between px-4 py-3 hover:bg-slate-50"
            >
              <span>{t.bezeichnung}</span>
              <span className="text-sm text-slate-500">{t.datum}</span>
            </Link>
          </li>
        ))}
        {turniere.length === 0 && (
          <li className="px-4 py-3 text-sm text-slate-500">
            Noch keine Turniere angelegt.
          </li>
        )}
      </ul>
    </div>
  )
}
