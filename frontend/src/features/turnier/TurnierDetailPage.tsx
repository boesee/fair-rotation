import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  MAX_SPIELE_PRO_TURNIER,
  addSpiel,
  getTurnier,
  listSpiele,
  loescheTurnier,
  pruefeModusMix,
  tauscheReihenfolge,
  type Modus,
  type Spiel,
  type Turnier,
} from './turnierApi'

export function TurnierDetailPage() {
  const { turnierId } = useParams<{ turnierId: string }>()
  const navigate = useNavigate()
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

  // UC-03/FR-26: Reihenfolge nur unter direkt benachbarten, noch nicht
  // gestarteten Spielen tauschbar – laeuft/beendet bleiben fix an ihrer
  // Position, damit kein geplantes Spiel an einem bereits gespielten
  // vorbeigezogen wird.
  async function handleVerschieben(index: number, richtung: -1 | 1) {
    const nachbarIndex = index + richtung
    const spiel = spiele[index]
    const nachbar = spiele[nachbarIndex]
    if (!spiel || !nachbar) return

    try {
      await tauscheReihenfolge(spiel, nachbar)
      setFehler(null)
      await laden()
    } catch {
      setFehler('Keine Verbindung – bitte erneut versuchen.')
    }
  }

  // FR-28: nur fuer Test-Turniere zugaenglich – loescht Turnier inkl. aller
  // Spiele/Zuteilungen/Einsaetze/Anwesenheit unwiderruflich (Cascade-Deletes
  // in supabase/schema.sql).
  async function handleLoeschen() {
    if (!turnier) return
    if (
      !confirm(
        `Test-Turnier "${turnier.bezeichnung}" inkl. aller Spiele, Zuteilungen und Einsätze unwiderruflich löschen?`,
      )
    ) {
      return
    }
    try {
      await loescheTurnier(turnier.id)
      navigate('/turniere', { replace: true })
    } catch {
      setFehler('Keine Verbindung – bitte erneut versuchen.')
    }
  }

  if (!turnier) {
    return fehler ? (
      <p className="text-sm text-red-600 dark:text-red-400">{fehler}</p>
    ) : (
      <p className="text-sm text-slate-500 dark:text-slate-400">Lädt…</p>
    )
  }

  const mixWarnung = pruefeModusMix(spiele)
  const maxErreicht = spiele.length >= MAX_SPIELE_PRO_TURNIER

  return (
    <div>
      <Link
        to="/turniere"
        className="mb-4 inline-block text-sm text-slate-500 dark:text-slate-400"
      >
        ← Alle Turniere
      </Link>
      <h1 className="mb-1 text-lg font-semibold text-slate-900 dark:text-slate-100">
        {turnier.bezeichnung}
        {turnier.ist_test && (
          <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
            Test
          </span>
        )}
      </h1>
      <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
        {turnier.datum} · {spiele.length} von {MAX_SPIELE_PRO_TURNIER} Spielen
        erfasst
      </p>

      {turnier.ist_test && (
        <button
          onClick={handleLoeschen}
          className="mb-4 rounded-md border border-red-300 px-4 py-2 text-sm font-medium text-red-600 dark:border-red-800 dark:text-red-400"
        >
          Test-Turnier löschen
        </button>
      )}

      <div className="mb-4 flex gap-4">
        <Link
          to={`/turniere/${turnier.id}/anwesenheit`}
          className="text-sm font-medium text-slate-700 underline dark:text-slate-300"
        >
          Anwesenheit
        </Link>
        <Link
          to={`/turniere/${turnier.id}/statistik`}
          className="text-sm font-medium text-slate-700 underline dark:text-slate-300"
        >
          Statistik
        </Link>
      </div>

      {mixWarnung && (
        <p className="mb-4 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
          {mixWarnung}
        </p>
      )}

      <ul className="mb-6 divide-y divide-slate-200 rounded-lg bg-white shadow-sm dark:divide-slate-700 dark:bg-slate-800">
        {spiele.map((s, index) => {
          const kannHoch = s.status === 'geplant' && spiele[index - 1]?.status === 'geplant'
          const kannRunter = s.status === 'geplant' && spiele[index + 1]?.status === 'geplant'

          return (
            <li key={s.id} className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-2">
                {s.status === 'geplant' && (
                  <div className="flex flex-col">
                    <button
                      type="button"
                      onClick={() => handleVerschieben(index, -1)}
                      disabled={!kannHoch}
                      title="Nach oben"
                      className="leading-none text-slate-500 disabled:opacity-20 dark:text-slate-400"
                    >
                      ▲
                    </button>
                    <button
                      type="button"
                      onClick={() => handleVerschieben(index, 1)}
                      disabled={!kannRunter}
                      title="Nach unten"
                      className="leading-none text-slate-500 disabled:opacity-20 dark:text-slate-400"
                    >
                      ▼
                    </button>
                  </div>
                )}
                <div>
                  <span className="font-medium text-slate-900 dark:text-slate-100">
                    Spiel {s.reihenfolge}
                  </span>{' '}
                  <span className="text-sm text-slate-500 dark:text-slate-400">
                    {s.modus} · {s.status}
                  </span>
                </div>
              </div>
              <Link
                to={
                  s.status === 'geplant'
                    ? `/spiele/${s.id}/vorbereiten`
                    : `/spiele/${s.id}/spielzeit`
                }
                className="text-sm font-medium text-slate-700 dark:text-slate-300"
              >
                Öffnen
              </Link>
            </li>
          )
        })}
        {spiele.length === 0 && (
          <li className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">
            Noch keine Spiele erfasst.
          </li>
        )}
      </ul>

      <div className="flex flex-wrap items-center gap-2 rounded-lg bg-white p-4 shadow-sm dark:bg-slate-800">
        <select
          value={modus}
          onChange={(e) => setModus(e.target.value as Modus)}
          disabled={maxErreicht}
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-base text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
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
        {fehler && (
          <p className="w-full text-sm text-red-600 dark:text-red-400">{fehler}</p>
        )}
      </div>
    </div>
  )
}
