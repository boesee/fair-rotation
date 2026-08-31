import { useEffect, useState, type FormEvent } from 'react'
import { listSpielerByIds, type Spieler } from '../kader/kaderApi'
import {
  listFelder,
  listZuteilung,
  type Feld,
  type Zuteilung,
} from '../spiel-vorbereiten/spielVorbereitenApi'
import {
  fuegeEinsatzHinzu,
  listEinsaetze,
  loescheEinsatz,
  updateEinsatzZeiten,
  type Einsatz,
} from '../spielzeit/spielzeitApi'
import { AnwesenheitEditor } from '../turnier/AnwesenheitEditor'
import { listSpiele, listTurniere, type Spiel, type Turnier } from '../turnier/turnierApi'

// <input type="datetime-local"> arbeitet mit lokaler Zeit ohne Zeitzonen-
// Suffix; new Date(...) interpretiert einen solchen String als lokale Zeit,
// darum funktioniert der Rundgang ISO -> lokal -> ISO korrekt.
function zuLocal(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

function vonLocal(value: string): string {
  return new Date(value).toISOString()
}

function nameVon(s: Spieler | undefined): string {
  if (!s) return '(unbekannter Spieler)'
  return s.vorname + (s.nachname_initiale ? ` ${s.nachname_initiale}.` : '')
}

interface ZeileProps {
  einsatz: Einsatz
  feldBezeichnung: string
  name: string
  onSpeichern: (eingewechseltUm: string, ausgewechseltUm: string | null) => void
  onLoeschen: () => void
}

function EinsatzZeile({
  einsatz,
  feldBezeichnung,
  name,
  onSpeichern,
  onLoeschen,
}: ZeileProps) {
  const [ein, setEin] = useState(zuLocal(einsatz.eingewechselt_um))
  const [aus, setAus] = useState(
    einsatz.ausgewechselt_um ? zuLocal(einsatz.ausgewechselt_um) : '',
  )
  const [nochAktiv, setNochAktiv] = useState(einsatz.ausgewechselt_um === null)

  return (
    <li className="flex flex-wrap items-center gap-2 px-4 py-3">
      <span className="w-40 shrink-0 text-slate-900 dark:text-slate-100">
        {name}
        <span className="block text-xs text-slate-500 dark:text-slate-400">
          {feldBezeichnung}
        </span>
      </span>
      <input
        type="datetime-local"
        step="1"
        value={ein}
        onChange={(e) => setEin(e.target.value)}
        className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
      />
      <label className="flex items-center gap-1 text-sm text-slate-700 dark:text-slate-300">
        <input
          type="checkbox"
          checked={nochAktiv}
          onChange={(e) => setNochAktiv(e.target.checked)}
          className="h-4 w-4"
        />
        noch aktiv
      </label>
      {!nochAktiv && (
        <input
          type="datetime-local"
          step="1"
          value={aus}
          onChange={(e) => setAus(e.target.value)}
          className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
        />
      )}
      <button
        onClick={() => onSpeichern(ein, nochAktiv ? null : aus)}
        className="rounded-md border border-slate-300 px-3 py-1 text-sm font-medium text-slate-700 dark:border-slate-600 dark:text-slate-300"
      >
        Speichern
      </button>
      <button
        onClick={onLoeschen}
        className="text-sm font-medium text-red-600 dark:text-red-400"
      >
        Löschen
      </button>
    </li>
  )
}

function EinsaetzeAdmin({ spiel }: { spiel: Spiel }) {
  const [felder, setFelder] = useState<Feld[]>([])
  const [zuteilung, setZuteilung] = useState<Zuteilung[]>([])
  const [einsaetze, setEinsaetze] = useState<Einsatz[]>([])
  const [spielerMap, setSpielerMap] = useState<Map<string, Spieler>>(new Map())
  const [fehler, setFehler] = useState<string | null>(null)

  const [neuFeldId, setNeuFeldId] = useState('')
  const [neuSpielerId, setNeuSpielerId] = useState('')
  const [neuEin, setNeuEin] = useState('')
  const [neuAus, setNeuAus] = useState('')

  async function laden() {
    try {
      const f = await listFelder(spiel.id)
      const feldIds = f.map((x) => x.id)
      const [z, e] = await Promise.all([listZuteilung(feldIds), listEinsaetze(feldIds)])
      const spielerIds = [...new Set([...z.map((x) => x.spieler_id), ...e.map((x) => x.spieler_id)])]
      const spieler = await listSpielerByIds(spielerIds)

      setFelder(f)
      setZuteilung(z)
      setEinsaetze(e)
      setSpielerMap(new Map(spieler.map((s) => [s.id, s])))
      setFehler(null)
    } catch {
      setFehler('Keine Verbindung – bitte erneut versuchen.')
    }
  }

  useEffect(() => {
    laden()
    setNeuFeldId('')
    setNeuSpielerId('')
    setNeuEin('')
    setNeuAus('')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spiel.id])

  async function handleSpeichern(
    id: string,
    eingewechseltUm: string,
    ausgewechseltUm: string | null,
  ) {
    try {
      await updateEinsatzZeiten(
        id,
        vonLocal(eingewechseltUm),
        ausgewechseltUm ? vonLocal(ausgewechseltUm) : null,
      )
      await laden()
    } catch {
      setFehler('Keine Verbindung – bitte erneut versuchen.')
    }
  }

  async function handleLoeschen(id: string) {
    if (!confirm('Diesen Einsatz wirklich löschen?')) return
    try {
      await loescheEinsatz(id)
      await laden()
    } catch {
      setFehler('Keine Verbindung – bitte erneut versuchen.')
    }
  }

  async function handleHinzufuegen(event: FormEvent) {
    event.preventDefault()
    if (!neuFeldId || !neuSpielerId || !neuEin) return
    try {
      await fuegeEinsatzHinzu(
        neuFeldId,
        neuSpielerId,
        vonLocal(neuEin),
        neuAus ? vonLocal(neuAus) : null,
      )
      setNeuFeldId('')
      setNeuSpielerId('')
      setNeuEin('')
      setNeuAus('')
      await laden()
    } catch {
      setFehler('Keine Verbindung – bitte erneut versuchen.')
    }
  }

  const zugeteilteSpieler = [...new Set(zuteilung.map((z) => z.spieler_id))]
    .map((id) => spielerMap.get(id))
    .filter((s): s is Spieler => s !== undefined)

  return (
    <div>
      {fehler && (
        <p className="mb-4 text-sm text-red-600 dark:text-red-400">{fehler}</p>
      )}

      {felder.map((feld) => {
        const eintraege = einsaetze
          .filter((e) => e.feld_id === feld.id)
          .sort((a, b) => a.eingewechselt_um.localeCompare(b.eingewechselt_um))

        return (
          <div key={feld.id} className="mb-4">
            <h3 className="mb-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
              {feld.bezeichnung}
            </h3>
            <ul className="divide-y divide-slate-200 rounded-lg bg-white shadow-sm dark:divide-slate-700 dark:bg-slate-800">
              {eintraege.map((e) => (
                <EinsatzZeile
                  key={e.id}
                  einsatz={e}
                  feldBezeichnung={feld.bezeichnung}
                  name={nameVon(spielerMap.get(e.spieler_id))}
                  onSpeichern={(ein, aus) => handleSpeichern(e.id, ein, aus)}
                  onLoeschen={() => handleLoeschen(e.id)}
                />
              ))}
              {eintraege.length === 0 && (
                <li className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">
                  Keine Einsätze auf diesem Feld.
                </li>
              )}
            </ul>
          </div>
        )
      })}

      <form
        onSubmit={handleHinzufuegen}
        className="flex flex-wrap items-center gap-2 rounded-lg bg-white p-4 shadow-sm dark:bg-slate-800"
      >
        <select
          value={neuSpielerId}
          onChange={(e) => setNeuSpielerId(e.target.value)}
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
        >
          <option value="">Spieler wählen…</option>
          {zugeteilteSpieler.map((s) => (
            <option key={s.id} value={s.id}>
              {nameVon(s)}
            </option>
          ))}
        </select>
        <select
          value={neuFeldId}
          onChange={(e) => setNeuFeldId(e.target.value)}
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
        >
          <option value="">Feld wählen…</option>
          {felder.map((f) => (
            <option key={f.id} value={f.id}>
              {f.bezeichnung}
            </option>
          ))}
        </select>
        <input
          type="datetime-local"
          step="1"
          value={neuEin}
          onChange={(e) => setNeuEin(e.target.value)}
          className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
        />
        <input
          type="datetime-local"
          step="1"
          value={neuAus}
          onChange={(e) => setNeuAus(e.target.value)}
          placeholder="Auswechselzeit (optional)"
          className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
        />
        <button
          type="submit"
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white"
        >
          Einsatz hinzufügen
        </button>
      </form>
    </div>
  )
}

function TurnierAdmin({ turnier }: { turnier: Turnier }) {
  const [spiele, setSpiele] = useState<Spiel[]>([])
  const [ausgewaehltesSpielId, setAusgewaehltesSpielId] = useState('')
  const [fehler, setFehler] = useState<string | null>(null)

  useEffect(() => {
    setAusgewaehltesSpielId('')
    listSpiele(turnier.id)
      .then(setSpiele)
      .catch(() => setFehler('Keine Verbindung – bitte erneut versuchen.'))
  }, [turnier.id])

  const ausgewaehltesSpiel = spiele.find((s) => s.id === ausgewaehltesSpielId)

  return (
    <div>
      {fehler && (
        <p className="mb-4 text-sm text-red-600 dark:text-red-400">{fehler}</p>
      )}

      <h2 className="mb-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
        Anwesenheit korrigieren
      </h2>
      <div className="mb-8">
        <AnwesenheitEditor turnierId={turnier.id} gesperrt={false} />
      </div>

      <h2 className="mb-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
        Einsätze &amp; Spielzeit korrigieren
      </h2>
      <select
        value={ausgewaehltesSpielId}
        onChange={(e) => setAusgewaehltesSpielId(e.target.value)}
        className="mb-4 rounded-md border border-slate-300 bg-white px-3 py-2 text-base text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
      >
        <option value="">Spiel wählen…</option>
        {spiele.map((s) => (
          <option key={s.id} value={s.id}>
            Spiel {s.reihenfolge} · {s.modus} · {s.status}
          </option>
        ))}
      </select>

      {ausgewaehltesSpiel && <EinsaetzeAdmin spiel={ausgewaehltesSpiel} />}
    </div>
  )
}

export function AdminPage() {
  const [turniere, setTurniere] = useState<Turnier[]>([])
  const [ausgewaehltesTurnierId, setAusgewaehltesTurnierId] = useState('')
  const [ladeFehler, setLadeFehler] = useState<string | null>(null)

  useEffect(() => {
    listTurniere()
      .then(setTurniere)
      .catch(() => setLadeFehler('Keine Verbindung – bitte Seite neu laden.'))
  }, [])

  if (ladeFehler)
    return <p className="text-sm text-red-600 dark:text-red-400">{ladeFehler}</p>

  const ausgewaehltesTurnier = turniere.find((t) => t.id === ausgewaehltesTurnierId)

  return (
    <div>
      <h1 className="mb-1 text-lg font-semibold text-slate-900 dark:text-slate-100">
        Admin
      </h1>
      <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">
        Nachträgliche Korrekturen – ohne Plausibilitätsprüfung, für den
        Ausnahmefall.
      </p>

      <select
        value={ausgewaehltesTurnierId}
        onChange={(e) => setAusgewaehltesTurnierId(e.target.value)}
        className="mb-6 rounded-md border border-slate-300 bg-white px-3 py-2 text-base text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
      >
        <option value="">Turnier wählen…</option>
        {turniere.map((t) => (
          <option key={t.id} value={t.id}>
            {t.datum} · {t.bezeichnung}
            {t.ist_test ? ' (Test)' : ''}
          </option>
        ))}
      </select>

      {ausgewaehltesTurnier && <TurnierAdmin turnier={ausgewaehltesTurnier} />}
    </div>
  )
}
