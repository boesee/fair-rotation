import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  berechneTurnierStatus,
  listSpielStatusAllerTurniere,
  listTurniere,
  type SpielStatus,
  type Turnier,
} from '../turnier/turnierApi'

// UX-Feedback: die Startseite war reiner Begruessungstext ohne Bezug zum
// aktuellen Turniertag. Zeigt jetzt einen direkten Sprung zum juengsten noch
// nicht vollstaendig beendeten Turnier (listTurniere() ist bereits nach
// Datum absteigend sortiert), sonst weiterhin die generische Navigations-
// Hilfe.
export function HomePage() {
  const [turniere, setTurniere] = useState<Turnier[] | null>(null)
  const [spielStatusRows, setSpielStatusRows] = useState<
    { turnier_id: string; status: SpielStatus }[]
  >([])

  useEffect(() => {
    Promise.all([listTurniere(), listSpielStatusAllerTurniere()])
      .then(([t, s]) => {
        setTurniere(t)
        setSpielStatusRows(s)
      })
      .catch(() => setTurniere([]))
  }, [])

  const aktuelles = turniere?.find(
    (t) =>
      berechneTurnierStatus(
        spielStatusRows.filter((r) => r.turnier_id === t.id),
      ) !== 'beendet',
  )

  return (
    <div>
      <h1 className="mb-4 text-lg font-semibold text-slate-900 dark:text-slate-100">
        Spielzeit-Rotation
      </h1>

      {aktuelles && (
        <Link
          to={`/turniere/${aktuelles.id}`}
          className="mb-4 block rounded-lg bg-white p-4 shadow-sm hover:bg-slate-50 dark:bg-slate-800 dark:hover:bg-slate-700"
        >
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Aktuelles Turnier
          </span>
          <div className="text-base font-medium text-slate-900 dark:text-slate-100">
            {aktuelles.bezeichnung}
          </div>
          <span className="text-sm text-slate-500 dark:text-slate-400">
            {aktuelles.datum}
          </span>
        </Link>
      )}

      <p className="text-sm text-slate-600 dark:text-slate-400">
        Kader, Turniere und Statistik über die Navigation oben erreichbar.
      </p>
    </div>
  )
}
