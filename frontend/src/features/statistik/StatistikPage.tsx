import { useEffect, useState } from 'react'
import { listTurniere, type Turnier } from '../turnier/turnierApi'

export function StatistikPage() {
  const [turniere, setTurniere] = useState<Turnier[] | null>(null)
  const [fehler, setFehler] = useState<string | null>(null)

  useEffect(() => {
    listTurniere()
      .then(setTurniere)
      .catch(() => setFehler('Statistik konnte nicht geladen werden.'))
  }, [])

  if (fehler) return <p className="text-sm text-red-600">{fehler}</p>
  if (!turniere) return <p className="text-sm text-slate-500">Lädt…</p>

  return (
    <div>
      <h1 className="mb-4 text-lg font-semibold text-slate-900">Statistik</h1>
      <p className="rounded-lg bg-white p-4 text-sm text-slate-600 shadow-sm">
        {turniere.length} Turnier{turniere.length === 1 ? '' : 'e'} erfasst.
        Kumulierte Spielzeit und Teilnahme-Kennzahlen je Spieler (UC-06)
        folgen in einem späteren Schritt.
      </p>
    </div>
  )
}
