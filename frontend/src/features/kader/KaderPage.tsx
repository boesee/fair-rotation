import { useEffect, useState, type FormEvent } from 'react'
import {
  addSpieler,
  findNamensdopplung,
  listSpieler,
  setAktiv,
  updateSpieler,
  type Spieler,
} from './kaderApi'

export function KaderPage() {
  const [aktive, setAktive] = useState<Spieler[]>([])
  const [inaktive, setInaktive] = useState<Spieler[]>([])
  const [zeigeInaktive, setZeigeInaktive] = useState(false)
  const [ladeFehler, setLadeFehler] = useState<string | null>(null)

  const [vorname, setVorname] = useState('')
  const [initiale, setInitiale] = useState('')
  const [vornameFehler, setVornameFehler] = useState(false)
  const [dopplungWarnung, setDopplungWarnung] = useState<string | null>(null)
  const [dopplungBestaetigen, setDopplungBestaetigen] = useState(false)
  const [speicherFehler, setSpeicherFehler] = useState<string | null>(null)

  const [bearbeiteId, setBearbeiteId] = useState<string | null>(null)
  const [bearbeiteVorname, setBearbeiteVorname] = useState('')
  const [bearbeiteInitiale, setBearbeiteInitiale] = useState('')

  async function laden() {
    try {
      const [a, i] = await Promise.all([listSpieler(true), listSpieler(false)])
      setAktive(a)
      setInaktive(i)
      setLadeFehler(null)
    } catch {
      // UC-02/E3: Netzwerkfehler beim Laden.
      setLadeFehler('Keine Verbindung – bitte Seite neu laden.')
    }
  }

  useEffect(() => {
    laden()
  }, [])

  async function handleHinzufuegen(event: FormEvent) {
    event.preventDefault()
    setSpeicherFehler(null)

    // UC-02/E1: Vorname ist Pflichtfeld.
    if (vorname.trim().length === 0) {
      setVornameFehler(true)
      return
    }
    setVornameFehler(false)

    const initialeWert = initiale.trim() || null

    // UC-02/E2: Warnung bei Namensgleichheit, blockiert das Speichern nicht
    // – der Trainer bestätigt explizit über "Trotzdem hinzufügen" statt
    // denselben Button ein zweites Mal zu tippen (war zuvor unklar).
    if (!dopplungBestaetigen) {
      const dopplung = await findNamensdopplung(vorname.trim(), initialeWert)
      if (dopplung) {
        setDopplungWarnung(
          'Es gibt bereits einen Spieler mit diesem Namen – Initiale ergänzen?',
        )
        setDopplungBestaetigen(true)
        return
      }
    }
    setDopplungWarnung(null)
    setDopplungBestaetigen(false)

    try {
      await addSpieler(vorname.trim(), initialeWert)
      setVorname('')
      setInitiale('')
      await laden()
    } catch {
      setSpeicherFehler('Keine Verbindung – bitte erneut versuchen.')
    }
  }

  function handleDopplungAbbrechen() {
    setDopplungWarnung(null)
    setDopplungBestaetigen(false)
  }

  function starteBearbeitung(s: Spieler) {
    setBearbeiteId(s.id)
    setBearbeiteVorname(s.vorname)
    setBearbeiteInitiale(s.nachname_initiale ?? '')
  }

  async function speichereBearbeitung(id: string) {
    if (bearbeiteVorname.trim().length === 0) return
    try {
      await updateSpieler(id, bearbeiteVorname.trim(), bearbeiteInitiale.trim() || null)
      setBearbeiteId(null)
      await laden()
    } catch {
      setSpeicherFehler('Keine Verbindung – bitte erneut versuchen.')
    }
  }

  async function handleEntfernen(s: Spieler) {
    // UC-02/A2: Sicherheitsabfrage vor dem Deaktivieren.
    if (!confirm(`"${s.vorname}" wirklich aus dem Kader entfernen?`)) return
    await setAktiv(s.id, false)
    await laden()
  }

  async function handleReaktivieren(s: Spieler) {
    await setAktiv(s.id, true)
    await laden()
  }

  const eingabeKlasse =
    'rounded-md border bg-white px-3 py-2 text-base text-slate-900 dark:bg-slate-900 dark:text-slate-100'

  return (
    <div>
      <h1 className="mb-4 text-lg font-semibold text-slate-900 dark:text-slate-100">
        Kader
      </h1>

      {ladeFehler && (
        <p className="mb-4 text-sm text-red-600 dark:text-red-400">{ladeFehler}</p>
      )}

      <form
        onSubmit={handleHinzufuegen}
        className="mb-6 flex flex-wrap items-start gap-2 rounded-lg bg-white p-4 shadow-sm dark:bg-slate-800"
      >
        <div>
          <input
            type="text"
            placeholder="Vorname"
            value={vorname}
            onChange={(e) => setVorname(e.target.value)}
            className={`${eingabeKlasse} ${
              vornameFehler ? 'border-red-500' : 'border-slate-300 dark:border-slate-600'
            }`}
          />
        </div>
        <input
          type="text"
          placeholder="Initiale (optional)"
          value={initiale}
          onChange={(e) => setInitiale(e.target.value)}
          className={`w-32 border-slate-300 dark:border-slate-600 ${eingabeKlasse}`}
        />
        {!dopplungBestaetigen && (
          <button
            type="submit"
            className="rounded-md bg-slate-900 px-4 py-2 text-base font-medium text-white"
          >
            Hinzufügen
          </button>
        )}
        {dopplungWarnung && (
          <div className="w-full">
            <p className="mb-2 text-sm text-amber-600 dark:text-amber-400">
              {dopplungWarnung}
            </p>
            <button
              type="submit"
              className="mr-2 rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white"
            >
              Trotzdem hinzufügen
            </button>
            <button
              type="button"
              onClick={handleDopplungAbbrechen}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 dark:border-slate-600 dark:text-slate-300"
            >
              Abbrechen
            </button>
          </div>
        )}
        {speicherFehler && (
          <p className="w-full text-sm text-red-600 dark:text-red-400">{speicherFehler}</p>
        )}
      </form>

      <ul className="mb-6 divide-y divide-slate-200 rounded-lg bg-white shadow-sm dark:divide-slate-700 dark:bg-slate-800">
        {aktive.map((s) => (
          <li key={s.id} className="flex items-center justify-between px-4 py-3">
            {bearbeiteId === s.id ? (
              <div className="flex flex-1 flex-wrap items-center gap-2">
                <input
                  value={bearbeiteVorname}
                  onChange={(e) => setBearbeiteVorname(e.target.value)}
                  className={`${eingabeKlasse} border-slate-300 px-2 py-1 dark:border-slate-600`}
                />
                <input
                  value={bearbeiteInitiale}
                  onChange={(e) => setBearbeiteInitiale(e.target.value)}
                  className={`w-24 ${eingabeKlasse} border-slate-300 px-2 py-1 dark:border-slate-600`}
                />
                <button
                  onClick={() => speichereBearbeitung(s.id)}
                  className="text-sm font-medium text-slate-900 dark:text-slate-100"
                >
                  Speichern
                </button>
                <button
                  onClick={() => setBearbeiteId(null)}
                  className="text-sm text-slate-500 dark:text-slate-400"
                >
                  Abbrechen
                </button>
              </div>
            ) : (
              <>
                <span className="text-slate-900 dark:text-slate-100">
                  {s.vorname}
                  {s.nachname_initiale ? ` ${s.nachname_initiale}.` : ''}
                </span>
                <div className="flex gap-3">
                  <button
                    onClick={() => starteBearbeitung(s)}
                    className="text-sm font-medium text-slate-700 dark:text-slate-300"
                  >
                    Bearbeiten
                  </button>
                  <button
                    onClick={() => handleEntfernen(s)}
                    className="text-sm font-medium text-red-600 dark:text-red-400"
                  >
                    Entfernen
                  </button>
                </div>
              </>
            )}
          </li>
        ))}
        {aktive.length === 0 && (
          <li className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">
            Noch keine Spieler im Kader.
          </li>
        )}
      </ul>

      <button
        onClick={() => setZeigeInaktive((v) => !v)}
        className="mb-2 text-sm font-medium text-slate-700 underline dark:text-slate-300"
      >
        {zeigeInaktive ? 'Inaktive Spieler ausblenden' : 'Inaktive Spieler anzeigen'}
      </button>

      {zeigeInaktive && (
        <ul className="divide-y divide-slate-200 rounded-lg bg-white shadow-sm dark:divide-slate-700 dark:bg-slate-800">
          {inaktive.map((s) => (
            <li key={s.id} className="flex items-center justify-between px-4 py-3">
              <span className="text-slate-500 dark:text-slate-400">
                {s.vorname}
                {s.nachname_initiale ? ` ${s.nachname_initiale}.` : ''}
              </span>
              <button
                onClick={() => handleReaktivieren(s)}
                className="text-sm font-medium text-slate-900 dark:text-slate-100"
              >
                Reaktivieren
              </button>
            </li>
          ))}
          {inaktive.length === 0 && (
            <li className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">
              Keine inaktiven Spieler.
            </li>
          )}
        </ul>
      )}
    </div>
  )
}
