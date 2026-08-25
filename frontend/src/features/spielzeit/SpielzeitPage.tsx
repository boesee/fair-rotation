import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getSpielMitTurnier, type Spiel, type Turnier } from '../turnier/turnierApi'

export function SpielzeitPage() {
  const { spielId } = useParams<{ spielId: string }>()
  const [daten, setDaten] = useState<{ spiel: Spiel; turnier: Turnier } | null>(
    null,
  )
  const [fehler, setFehler] = useState<string | null>(null)

  useEffect(() => {
    if (!spielId) return
    getSpielMitTurnier(spielId)
      .then(setDaten)
      .catch(() => setFehler('Spiel konnte nicht geladen werden.'))
  }, [spielId])

  if (fehler) return <p className="text-sm text-red-600">{fehler}</p>
  if (!daten) return <p className="text-sm text-slate-500">Lädt…</p>

  return (
    <div>
      <Link
        to={`/turniere/${daten.turnier.id}`}
        className="mb-4 inline-block text-sm text-slate-500"
      >
        ← {daten.turnier.bezeichnung}
      </Link>
      <h1 className="mb-1 text-lg font-semibold text-slate-900">
        Spielzeit erfassen – Spiel {daten.spiel.reihenfolge}
      </h1>
      <p className="mb-4 text-sm text-slate-500">
        {daten.spiel.modus} · Status: {daten.spiel.status}
      </p>
      <p className="rounded-lg bg-white p-4 text-sm text-slate-600 shadow-sm">
        Ein-/Auswechseln und Timer pro Spieler (UC-05) folgen in einem
        späteren Schritt.
      </p>
    </div>
  )
}
