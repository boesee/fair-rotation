import { useEffect, useState } from 'react'
import { listSpieler, type Spieler } from '../kader/kaderApi'
import { listTurnierAnwesenheit, speichereTurnierAnwesenheit } from './anwesenheitApi'

interface Props {
  turnierId: string
  // true auf der normalen Anwesenheits-Seite eines beendeten Turniers
  // (FR-27a): dort nur noch im Admin-Bereich korrigierbar.
  gesperrt: boolean
}

export function AnwesenheitEditor({ turnierId, gesperrt }: Props) {
  const [kader, setKader] = useState<Spieler[]>([])
  const [anwesenheitMap, setAnwesenheitMap] = useState<Record<string, boolean>>({})
  const [ladeFehler, setLadeFehler] = useState<string | null>(null)
  const [speicherFehler, setSpeicherFehler] = useState<string | null>(null)
  const [gespeichert, setGespeichert] = useState(false)

  async function laden() {
    try {
      const [k, bestehende] = await Promise.all([
        listSpieler(true),
        listTurnierAnwesenheit(turnierId),
      ])
      setKader(k)
      const map: Record<string, boolean> = {}
      k.forEach((s) => {
        map[s.id] =
          bestehende.find((a) => a.spieler_id === s.id)?.anwesend ?? false
      })
      setAnwesenheitMap(map)
      setLadeFehler(null)
    } catch {
      setLadeFehler('Keine Verbindung – bitte Seite neu laden.')
    }
  }

  useEffect(() => {
    laden()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turnierId])

  function toggle(spielerId: string) {
    setGespeichert(false)
    setAnwesenheitMap((m) => ({ ...m, [spielerId]: !m[spielerId] }))
  }

  async function handleSpeichern() {
    setSpeicherFehler(null)
    try {
      await speichereTurnierAnwesenheit(
        turnierId,
        kader.map((s) => s.id),
        anwesenheitMap,
      )
      setGespeichert(true)
    } catch {
      setSpeicherFehler('Keine Verbindung – bitte erneut versuchen.')
    }
  }

  if (ladeFehler)
    return <p className="text-sm text-red-600 dark:text-red-400">{ladeFehler}</p>

  return (
    <div>
      <ul className="mb-4 divide-y divide-slate-200 rounded-lg bg-white shadow-sm dark:divide-slate-700 dark:bg-slate-800">
        {kader.map((s) => (
          <li key={s.id} className="flex items-center justify-between px-4 py-3">
            <label className="flex flex-1 items-center gap-3 text-slate-900 dark:text-slate-100">
              <input
                type="checkbox"
                checked={anwesenheitMap[s.id] ?? false}
                onChange={() => toggle(s.id)}
                disabled={gesperrt}
                className="h-5 w-5"
              />
              <span>
                {s.vorname}
                {s.nachname_initiale ? ` ${s.nachname_initiale}.` : ''}
              </span>
            </label>
          </li>
        ))}
        {kader.length === 0 && (
          <li className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">
            Keine aktiven Spieler im Kader.
          </li>
        )}
      </ul>

      {speicherFehler && (
        <p className="mb-4 text-sm text-red-600 dark:text-red-400">{speicherFehler}</p>
      )}
      {gespeichert && (
        <p className="mb-4 text-sm text-green-700 dark:text-green-400">
          Anwesenheit gespeichert.
        </p>
      )}

      {!gesperrt && (
        <button
          onClick={handleSpeichern}
          className="rounded-md bg-slate-900 px-4 py-2 text-base font-medium text-white"
        >
          Speichern
        </button>
      )}
    </div>
  )
}
