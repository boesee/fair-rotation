import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { formatZeit } from '../spielzeit/spielzeitApi'
import { getTurnier, type Turnier } from '../turnier/turnierApi'
import {
  berechneStatistik,
  ermittleAusschluesse,
  type SpielerStatistik,
} from './statistikApi'

export function StatistikPage() {
  const { turnierId } = useParams<{ turnierId?: string }>()
  const [turnier, setTurnier] = useState<Turnier | null>(null)
  const [statistik, setStatistik] = useState<SpielerStatistik[] | null>(null)
  const [ausschluesse, setAusschluesse] = useState<{
    laufendAnzahl: number
    testAnzahl: number
  } | null>(null)
  const [fehler, setFehler] = useState<string | null>(null)

  async function laden() {
    try {
      const [s, t, a] = await Promise.all([
        berechneStatistik(turnierId),
        turnierId ? getTurnier(turnierId) : Promise.resolve(null),
        turnierId ? Promise.resolve(null) : ermittleAusschluesse(),
      ])
      setStatistik(s)
      setTurnier(t)
      setAusschluesse(a)
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
        <p className="mb-4 text-sm text-red-600 dark:text-red-400">{fehler}</p>
        <button
          onClick={laden}
          className="rounded-md border border-slate-300 px-4 py-2 text-base font-medium text-slate-700 dark:border-slate-600 dark:text-slate-300"
        >
          Erneut versuchen
        </button>
      </div>
    )
  }
  if (!statistik)
    return <p className="text-sm text-slate-500 dark:text-slate-400">Lädt…</p>

  return (
    <div>
      {turnier && (
        <Link
          to={`/turniere/${turnier.id}`}
          className="mb-4 inline-block text-sm text-slate-500 dark:text-slate-400"
        >
          ← {turnier.bezeichnung}
        </Link>
      )}
      <h1 className="mb-1 text-lg font-semibold text-slate-900 dark:text-slate-100">
        {turnier ? `Statistik – ${turnier.bezeichnung}` : 'Statistik – alle Turniere'}
      </h1>

      {ausschluesse && (ausschluesse.laufendAnzahl > 0 || ausschluesse.testAnzahl > 0) && (
        <p className="mb-4 text-xs text-slate-500 dark:text-slate-400">
          {[
            ausschluesse.laufendAnzahl > 0 &&
              `${ausschluesse.laufendAnzahl} noch nicht abgeschlossene${
                ausschluesse.laufendAnzahl === 1 ? 's' : ''
              } Turnier${ausschluesse.laufendAnzahl === 1 ? '' : 'e'}`,
            ausschluesse.testAnzahl > 0 &&
              `${ausschluesse.testAnzahl} Test-Turnier${ausschluesse.testAnzahl === 1 ? '' : 'e'}`,
          ]
            .filter(Boolean)
            .join(' und ')}{' '}
          {ausschluesse.laufendAnzahl + ausschluesse.testAnzahl === 1
            ? 'fehlt'
            : 'fehlen'}{' '}
          in dieser Übersicht.
        </p>
      )}

      {statistik.length === 0 ? (
        // UC-06/E1
        <p className="rounded-lg bg-white p-4 text-sm text-slate-600 shadow-sm dark:bg-slate-800 dark:text-slate-300">
          Noch keine Daten vorhanden.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-lg bg-white shadow-sm dark:bg-slate-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-500 dark:border-slate-700 dark:text-slate-400">
                <th className="px-4 py-2 font-medium">Spieler</th>
                <th className="px-4 py-2 font-medium">Spielzeit</th>
                {!turnier && (
                  <th className="px-4 py-2 font-medium">Turniere anwesend</th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-900 dark:divide-slate-700 dark:text-slate-100">
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
