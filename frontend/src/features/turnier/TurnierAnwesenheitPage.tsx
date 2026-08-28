import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { listSpieler, type Spieler } from '../kader/kaderApi'
import {
  listTurnierAnwesenheit,
  speichereTurnierAnwesenheit,
} from './anwesenheitApi'
import { getTurnier, type Turnier } from './turnierApi'

export function TurnierAnwesenheitPage() {
  const { turnierId } = useParams<{ turnierId: string }>()

  const [turnier, setTurnier] = useState<Turnier | null>(null)
  const [kader, setKader] = useState<Spieler[]>([])
  const [anwesenheitMap, setAnwesenheitMap] = useState<Record<string, boolean>>(
    {},
  )
  const [ladeFehler, setLadeFehler] = useState<string | null>(null)
  const [speicherFehler, setSpeicherFehler] = useState<string | null>(null)
  const [gespeichert, setGespeichert] = useState(false)

  async function laden() {
    if (!turnierId) return
    try {
      const [t, k, bestehende] = await Promise.all([
        getTurnier(turnierId),
        listSpieler(true),
        listTurnierAnwesenheit(turnierId),
      ])
      setTurnier(t)
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
    if (!turnierId) return
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

  if (ladeFehler) return <p className="text-sm text-red-600">{ladeFehler}</p>
  if (!turnier) return <p className="text-sm text-slate-500">Lädt…</p>

  return (
    <div>
      <Link
        to={`/turniere/${turnier.id}`}
        className="mb-4 inline-block text-sm text-slate-500"
      >
        ← {turnier.bezeichnung}
      </Link>
      <h1 className="mb-1 text-lg font-semibold text-slate-900">
        Anwesenheit
      </h1>
      <p className="mb-4 text-sm text-slate-500">
        Gilt für alle Spiele dieses Turniers und kann jederzeit angepasst
        werden.
      </p>

      <ul className="mb-4 divide-y divide-slate-200 rounded-lg bg-white shadow-sm">
        {kader.map((s) => (
          <li key={s.id} className="flex items-center justify-between px-4 py-3">
            <label className="flex flex-1 items-center gap-3">
              <input
                type="checkbox"
                checked={anwesenheitMap[s.id] ?? false}
                onChange={() => toggle(s.id)}
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
          <li className="px-4 py-3 text-sm text-slate-500">
            Keine aktiven Spieler im Kader.
          </li>
        )}
      </ul>

      {speicherFehler && (
        <p className="mb-4 text-sm text-red-600">{speicherFehler}</p>
      )}
      {gespeichert && (
        <p className="mb-4 text-sm text-green-700">Anwesenheit gespeichert.</p>
      )}

      <button
        onClick={handleSpeichern}
        className="rounded-md bg-slate-900 px-4 py-2 text-base font-medium text-white"
      >
        Speichern
      </button>
    </div>
  )
}
