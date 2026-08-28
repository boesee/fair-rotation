import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { listSpielerByIds, type Spieler } from '../kader/kaderApi'
import { listAnwesendeSpielerIds } from '../turnier/anwesenheitApi'
import { getSpielMitTurnier, type Spiel, type Turnier } from '../turnier/turnierApi'
import {
  hatEinsaetze,
  listFelder,
  listZuteilung,
  speichereZuteilung,
  type Feld,
} from './spielVorbereitenApi'

export function SpielVorbereitenPage() {
  const { spielId } = useParams<{ spielId: string }>()
  const navigate = useNavigate()

  const [daten, setDaten] = useState<{ spiel: Spiel; turnier: Turnier } | null>(
    null,
  )
  const [felder, setFelder] = useState<Feld[]>([])
  const [anwesende, setAnwesende] = useState<Spieler[]>([])
  const [gesperrt, setGesperrt] = useState(false)
  const [zuteilungMap, setZuteilungMap] = useState<Record<string, string>>({})

  const [ladeFehler, setLadeFehler] = useState<string | null>(null)
  const [zuteilungFehlt, setZuteilungFehlt] = useState<Set<string>>(new Set())
  const [speicherFehler, setSpeicherFehler] = useState<string | null>(null)

  async function laden() {
    if (!spielId) return
    try {
      const d = await getSpielMitTurnier(spielId)
      const f = await listFelder(spielId)
      const feldIds = f.map((x) => x.id)
      const [anwesendeIds, zuteilungRows, einsatzVorhanden] = await Promise.all([
        listAnwesendeSpielerIds(d.turnier.id),
        listZuteilung(feldIds),
        hatEinsaetze(feldIds),
      ])
      const anwesendeSpieler = await listSpielerByIds(anwesendeIds)

      setDaten(d)
      setFelder(f)
      setAnwesende(
        anwesendeSpieler.sort((a, b) => a.vorname.localeCompare(b.vorname)),
      )
      setGesperrt(einsatzVorhanden)

      const zMap: Record<string, string> = {}
      zuteilungRows.forEach((z) => {
        zMap[z.spieler_id] = z.feld_id
      })
      setZuteilungMap(zMap)

      setLadeFehler(null)
    } catch {
      setLadeFehler('Keine Verbindung – bitte Seite neu laden.')
    }
  }

  useEffect(() => {
    laden()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spielId])

  function setZuteilung(spielerId: string, feldId: string) {
    setZuteilungMap((m) => ({ ...m, [spielerId]: feldId }))
  }

  async function handleSpeichern() {
    if (!spielId || !daten) return
    setSpeicherFehler(null)
    setZuteilungFehlt(new Set())

    let zuteilung: Record<string, string> = {}
    if (daten.spiel.modus === '3vs3') {
      const fehlend = anwesende.filter((s) => !zuteilungMap[s.id])
      // UC-04/E2
      if (fehlend.length > 0) {
        setZuteilungFehlt(new Set(fehlend.map((s) => s.id)))
        return
      }
      zuteilung = Object.fromEntries(
        anwesende.map((s) => [s.id, zuteilungMap[s.id]]),
      )
    } else {
      // UC-04/A1: 6vs6 – automatische Zuteilung auf das eine Feld.
      const [feld] = felder
      anwesende.forEach((s) => {
        zuteilung[s.id] = feld.id
      })
    }

    try {
      await speichereZuteilung(spielId, felder.map((f) => f.id), zuteilung)
      await laden()
    } catch {
      setSpeicherFehler('Keine Verbindung – bitte erneut versuchen.')
    }
  }

  if (ladeFehler) return <p className="text-sm text-red-600">{ladeFehler}</p>
  if (!daten) return <p className="text-sm text-slate-500">Lädt…</p>

  const { spiel, turnier } = daten
  const ist3vs3 = spiel.modus === '3vs3'

  return (
    <div>
      <Link
        to={`/turniere/${turnier.id}`}
        className="mb-4 inline-block text-sm text-slate-500"
      >
        ← {turnier.bezeichnung}
      </Link>
      <h1 className="mb-1 text-lg font-semibold text-slate-900">
        Spiel {spiel.reihenfolge} vorbereiten
      </h1>
      <p className="mb-4 text-sm text-slate-500">
        {spiel.modus} · Status: {spiel.status}
      </p>

      {anwesende.length === 0 && (
        <p className="mb-4 rounded-lg bg-white p-4 text-sm text-slate-600 shadow-sm">
          Für dieses Turnier ist noch keine Anwesenheit erfasst.{' '}
          <Link
            to={`/turniere/${turnier.id}/anwesenheit`}
            className="font-medium text-slate-900 underline"
          >
            Jetzt erfassen
          </Link>
        </p>
      )}

      {gesperrt && (
        <p className="mb-4 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-700">
          Das Spiel läuft bereits – die Feldzuteilung kann nicht mehr
          geändert werden.
        </p>
      )}

      {anwesende.length > 0 && (
        <ul className="mb-6 divide-y divide-slate-200 rounded-lg bg-white shadow-sm">
          {anwesende.map((s) => {
            const braucht = zuteilungFehlt.has(s.id)
            return (
              <li key={s.id} className="flex flex-col gap-2 px-4 py-3">
                <span>
                  {s.vorname}
                  {s.nachname_initiale ? ` ${s.nachname_initiale}.` : ''}
                </span>

                {ist3vs3 && (
                  <div className="flex items-center gap-2">
                    {felder.map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        disabled={gesperrt}
                        onClick={() => setZuteilung(s.id, f.id)}
                        className={`rounded-md border px-3 py-1 text-sm ${
                          zuteilungMap[s.id] === f.id
                            ? 'border-slate-900 bg-slate-900 text-white'
                            : 'border-slate-300 text-slate-700'
                        }`}
                      >
                        {f.bezeichnung}
                      </button>
                    ))}
                    {braucht && (
                      <span className="text-sm text-red-600">Feld wählen</span>
                    )}
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}

      {speicherFehler && (
        <p className="mb-4 text-sm text-red-600">{speicherFehler}</p>
      )}

      {!gesperrt && anwesende.length > 0 && (
        <button
          onClick={handleSpeichern}
          className="rounded-md bg-slate-900 px-4 py-2 text-base font-medium text-white"
        >
          Zuteilung speichern
        </button>
      )}

      {(gesperrt || spiel.status === 'laufend') && (
        <button
          onClick={() => navigate(`/spiele/${spiel.id}/spielzeit`)}
          className="ml-2 rounded-md border border-slate-300 px-4 py-2 text-base font-medium text-slate-700"
        >
          Weiter zur Spielzeit-Erfassung
        </button>
      )}
    </div>
  )
}
