import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { formatZeit } from '../spielzeit/spielzeitApi'
import { getTurnier, type Turnier } from '../turnier/turnierApi'
import { berechneStatistik, type SpielerStatistik } from './statistikApi'

export function StatistikPage() {
  const { turnierId } = useParams<{ turnierId?: string }>()
  const [turnier, setTurnier] = useState<Turnier | null>(null)
  const [statistik, setStatistik] = useState<SpielerStatistik[] | null>(null)
  const [fehler, setFehler] = useState<string | null>(null)

  async function laden() {
    try {
      const [s, t] = await Promise.all([
        berechneStatistik(turnierId),
        turnierId ? getTurnier(turnierId) : Promise.resolve(null),
      ])
      setStatistik(s)
      setTurnier(t)
      setFehler(null)
    } catch {
      // UC-06/E2
      setFehler('Keine Verbindung – bitte erneut versuchen.')
    }
  }

  useEffect(() => {
    laden()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turnierId])

  if (fehler) {
    return (
      <div>
        <p className="mb-4 text-sm text-red-600">{fehler}</p>
        <button
          onClick={laden}
          className="rounded-md border border-slate-300 px-4 py-2 text-base font-medium text-slate-700"
        >
          Erneut versuchen
        </button>
      </div>
    )
  }
  if (!statistik) return <p className="text-sm text-slate-500">Lädt…</p>

  return (
    <div>
      {turnier && (
        <Link
          to={`/turniere/${turnier.id}`}
          className="mb-4 inline-block text-sm text-slate-500"
        >
          ← {turnier.bezeichnung}
        </Link>
      )}
      <h1 className="mb-4 text-lg font-semibold text-slate-900">
        {turnier ? `Statistik – ${turnier.bezeichnung}` : 'Statistik – alle Turniere'}
      </h1>

      {statistik.length === 0 ? (
        // UC-06/E1
        <p className="rounded-lg bg-white p-4 text-sm text-slate-600 shadow-sm">
          Noch keine Daten vorhanden.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-500">
                <th className="px-4 py-2 font-medium">Spieler</th>
                <th className="px-4 py-2 font-medium">Spielzeit</th>
                {!turnier && (
                  <th className="px-4 py-2 font-medium">Turniere anwesend</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {statistik.map((s) => (
                <tr key={s.spielerId}>
                  <td className="px-4 py-2">{s.name}</td>
                  <td className="px-4 py-2">{formatZeit(s.kumulierteSekunden)}</td>
                  {!turnier && (
                    <td className="px-4 py-2">{s.anzahlTurniereAnwesend}</td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
