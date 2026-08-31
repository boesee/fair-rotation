import { useEffect, useState } from 'react'
import { listSpieler, type Spieler } from '../kader/kaderApi'
import {
  listTurnierAnwesenheit,
  speichereTurnierAnwesenheit,
  type AbwesendGrund,
} from './anwesenheitApi'

interface Props {
  turnierId: string
  // true auf der normalen Anwesenheits-Seite eines beendeten Turniers
  // (FR-27a): dort nur noch im Admin-Bereich korrigierbar.
  gesperrt: boolean
}

export function AnwesenheitEditor({ turnierId, gesperrt }: Props) {
  const [kader, setKader] = useState<Spieler[]>([])
  // UX-Feedback: Standardannahme ist "alle dabei" (meistens der Fall, oft
  // schon Tage vorher bekannt) – der Trainer markiert nur die Ausnahmen
  // ("fehlt"), statt den ganzen Kader durchzuhaken.
  const [fehltMap, setFehltMap] = useState<Record<string, boolean>>({})
  const [grundMap, setGrundMap] = useState<Record<string, AbwesendGrund>>({})
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
      const fehlt: Record<string, boolean> = {}
      const grund: Record<string, AbwesendGrund> = {}
      k.forEach((s) => {
        const eintrag = bestehende.find((a) => a.spieler_id === s.id)
        fehlt[s.id] = eintrag ? !eintrag.anwesend : false
        if (eintrag?.abwesend_grund) grund[s.id] = eintrag.abwesend_grund
      })
      setFehltMap(fehlt)
      setGrundMap(grund)
      setLadeFehler(null)
    } catch {
      setLadeFehler('Keine Verbindung – bitte Seite neu laden.')
    }
  }

  useEffect(() => {
    laden()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turnierId])

  function toggleFehlt(spielerId: string) {
    setGespeichert(false)
    setFehltMap((m) => ({ ...m, [spielerId]: !m[spielerId] }))
  }

  function setGrund(spielerId: string, grund: AbwesendGrund) {
    setGespeichert(false)
    setGrundMap((m) => ({ ...m, [spielerId]: grund }))
  }

  async function handleSpeichern() {
    setSpeicherFehler(null)
    try {
      const anwesenheitMap: Record<string, boolean> = {}
      kader.forEach((s) => {
        anwesenheitMap[s.id] = !fehltMap[s.id]
      })
      await speichereTurnierAnwesenheit(
        turnierId,
        kader.map((s) => s.id),
        anwesenheitMap,
        grundMap,
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
        {kader.map((s) => {
          const fehlt = fehltMap[s.id] ?? false
          return (
            <li key={s.id} className="px-4 py-3">
              <label className="flex items-center gap-3 text-slate-900 dark:text-slate-100">
                <input
                  type="checkbox"
                  checked={fehlt}
                  onChange={() => toggleFehlt(s.id)}
                  disabled={gesperrt}
                  className="h-5 w-5"
                />
                <span>
                  {s.vorname}
                  {s.nachname_initiale ? ` ${s.nachname_initiale}.` : ''}
                  {fehlt && (
                    <span className="ml-1 text-amber-700 dark:text-amber-400">
                      fehlt
                    </span>
                  )}
                </span>
              </label>

              {fehlt && (
                <div className="ml-8 mt-2 flex gap-4 text-sm text-slate-600 dark:text-slate-300">
                  <label className="flex items-center gap-1">
                    <input
                      type="radio"
                      name={`grund-${s.id}`}
                      checked={(grundMap[s.id] ?? 'privat') === 'privat'}
                      onChange={() => setGrund(s.id, 'privat')}
                      disabled={gesperrt}
                    />
                    privat verhindert
                  </label>
                  <label className="flex items-center gap-1">
                    <input
                      type="radio"
                      name={`grund-${s.id}`}
                      checked={grundMap[s.id] === 'kader_voll'}
                      onChange={() => setGrund(s.id, 'kader_voll')}
                      disabled={gesperrt}
                    />
                    Kader war voll
                  </label>
                </div>
              )}
            </li>
          )
        })}
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
