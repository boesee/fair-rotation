import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  MAX_SPIELE_PRO_TURNIER,
  addSpiel,
  getTurnier,
  listSpiele,
  pruefeModusMix,
  type Modus,
  type Spiel,
  type Turnier,
} from './turnierApi'

export function TurnierDetailPage() {
  const { turnierId } = useParams<{ turnierId: string }>()
  const [turnier, setTurnier] = useState<Turnier | null>(null)
  const [spiele, setSpiele] = useState<Spiel[]>([])
  const [modus, setModus] = useState<Modus>('3vs3')
  const [fehler, setFehler] = useState<string | null>(null)

  async function laden() {
    if (!turnierId) return
    try {
      const [t, s] = await Promise.all([
        getTurnier(turnierId),
        listSpiele(turnierId),
      ])
      setTurnier(t)
      setSpiele(s)
      setFehler(null)
    } catch {
      setFehler('Keine Verbindung – bitte Seite neu laden.')
    }
  }

  useEffect(() => {
    laden()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turnierId])

  async function handleSpielHinzufuegen() {
    if (!turnierId) return
    try {
      await addSpiel(turnierId, modus)
      setFehler(null)
      await laden()
    } catch (e) {
      if (e instanceof Error && e.message === 'MAX_SPIELE_ERREICHT') {
        // UC-03/E1
        setFehler(`Maximale Anzahl von ${MAX_SPIELE_PRO_TURNIER} Spielen erreicht.`)
      } else {
        setFehler('Keine Verbindung – bitte erneut versuchen.')
      }
    }
  }

  if (!turnier) {
    return fehler ? (
      <p className="text-sm text-red-600">{fehler}</p>
    ) : (
      <p className="text-sm text-slate-500">Lädt…</p>
    )
  }

  const mixWarnung = pruefeModusMix(spiele)
  const maxErreicht = spiele.length >= MAX_SPIELE_PRO_TURNIER

  return (
    <div>
      <Link to="/turniere" className="mb-4 inline-block text-sm text-slate-500">
        ← Alle Turniere
      </Link>
      <h1 className="mb-1 text-lg font-semibold text-slate-900">
        {turnier.bezeichnung}
      </h1>
      <p className="mb-4 text-sm text-slate-500">
        {turnier.datum} · {spiele.length} von {MAX_SPIELE_PRO_TURNIER} Spielen
        erfasst
      </p>

      {mixWarnung && (
        <p className="mb-4 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-700">
          {mixWarnung}
        </p>
      )}

      <ul className="mb-6 divide-y divide-slate-200 rounded-lg bg-white shadow-sm">
        {spiele.map((s) => (
          <li key={s.id} className="flex items-center justify-between px-4 py-3">
            <div>
              <span className="font-medium">Spiel {s.reihenfolge}</span>{' '}
              <span className="text-sm text-slate-500">
                {s.modus} · {s.status}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <Link
                to={`/spiele/${s.id}/vorbereiten`}
                className="text-sm font-medium text-slate-700"
              >
                Öffnen
              </Link>
              {/* UC-03/A2, A4: Reihenfolge-Bearbeitung und Loeschen sind in
                  diesem Schritt bewusst noch nicht umgesetzt. */}
              <span
                title="Kommt in einem späteren Schritt"
                className="cursor-not-allowed text-sm text-slate-300"
              >
                Löschen
              </span>
            </div>
          </li>
        ))}
        {spiele.length === 0 && (
          <li className="px-4 py-3 text-sm text-slate-500">
            Noch keine Spiele erfasst.
          </li>
        )}
      </ul>

      <span
        title="Kommt in einem späteren Schritt"
        className="mb-4 inline-block cursor-not-allowed text-sm text-slate-300"
      >
        Reihenfolge bearbeiten
      </span>

      <div className="flex flex-wrap items-center gap-2 rounded-lg bg-white p-4 shadow-sm">
        <select
          value={modus}
          onChange={(e) => setModus(e.target.value as Modus)}
          disabled={maxErreicht}
          className="rounded-md border border-slate-300 px-3 py-2 text-base"
        >
          <option value="3vs3">3vs3</option>
          <option value="6vs6">6vs6</option>
        </select>
        <button
          onClick={handleSpielHinzufuegen}
          disabled={maxErreicht}
          className="rounded-md bg-slate-900 px-4 py-2 text-base font-medium text-white disabled:opacity-50"
        >
          Spiel hinzufügen
        </button>
        {fehler && <p className="w-full text-sm text-red-600">{fehler}</p>}
      </div>
    </div>
  )
}
