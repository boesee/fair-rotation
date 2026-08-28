import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { listSpielerByIds, type Spieler } from '../kader/kaderApi'
import {
  getSpielMitTurnier,
  type Spiel,
  type Turnier,
} from '../turnier/turnierApi'
import {
  listFelder,
  listZuteilung,
  type Feld,
  type Zuteilung,
} from '../spiel-vorbereiten/spielVorbereitenApi'
import {
  auswechseln,
  einwechseln,
  formatZeit,
  listEinsaetze,
  spielBeenden,
  type Einsatz,
} from './spielzeitApi'

interface Eintrag {
  spieler: Spieler
  offenerEinsatz: Einsatz | undefined
  gesamtSekunden: number
}

export function SpielzeitPage() {
  const { spielId } = useParams<{ spielId: string }>()

  const [daten, setDaten] = useState<{ spiel: Spiel; turnier: Turnier } | null>(
    null,
  )
  const [felder, setFelder] = useState<Feld[]>([])
  const [zuteilung, setZuteilung] = useState<Zuteilung[]>([])
  const [spieler, setSpieler] = useState<Spieler[]>([])
  const [einsaetze, setEinsaetze] = useState<Einsatz[]>([])

  const [ladeFehler, setLadeFehler] = useState<string | null>(null)
  const [aktionFehler, setAktionFehler] = useState<string | null>(null)
  const [, setTick] = useState(0)

  async function laden() {
    if (!spielId) return
    try {
      const d = await getSpielMitTurnier(spielId)
      const f = await listFelder(spielId)
      const feldIds = f.map((x) => x.id)
      const [z, e] = await Promise.all([
        listZuteilung(feldIds),
        listEinsaetze(feldIds),
      ])
      const s = await listSpielerByIds(z.map((x) => x.spieler_id))

      setDaten(d)
      setFelder(f)
      setZuteilung(z)
      setEinsaetze(e)
      setSpieler(s)
      setLadeFehler(null)
    } catch {
      setLadeFehler('Keine Verbindung – bitte Seite neu laden.')
    }
  }

  useEffect(() => {
    laden()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spielId])

  // FR-32/33: laufende Spielzeit wird clientseitig jede Sekunde neu
  // berechnet, kein Round-Trip zum Server noetig.
  useEffect(() => {
    if (daten?.spiel.status !== 'laufend') return
    const interval = setInterval(() => setTick((t) => t + 1), 1000)
    return () => clearInterval(interval)
  }, [daten?.spiel.status])

  if (ladeFehler) return <p className="text-sm text-red-600">{ladeFehler}</p>
  if (!daten) return <p className="text-sm text-slate-500">Lädt…</p>

  const { spiel, turnier } = daten
  const feldIds = felder.map((f) => f.id)
  const spielerMap = new Map(spieler.map((s) => [s.id, s]))
  const nameVon = (s: Spieler) =>
    s.vorname + (s.nachname_initiale ? ` ${s.nachname_initiale}.` : '')

  function eintraegeFuerFeld(feldId: string): Eintrag[] {
    const liste: Eintrag[] = zuteilung
      .filter((z) => z.feld_id === feldId)
      .map((z) => spielerMap.get(z.spieler_id))
      .filter((s): s is Spieler => s !== undefined)
      .map((s) => {
        const eigeneEinsaetze = einsaetze.filter((e) => e.spieler_id === s.id)
        const offenerEinsatz = eigeneEinsaetze.find(
          (e) => e.ausgewechselt_um === null,
        )
        const kumuliertSekunden = eigeneEinsaetze
          .filter((e) => e.ausgewechselt_um !== null)
          .reduce(
            (sum, e) =>
              sum +
              (new Date(e.ausgewechselt_um as string).getTime() -
                new Date(e.eingewechselt_um).getTime()) /
                1000,
            0,
          )
        const laufendSekunden = offenerEinsatz
          ? (Date.now() - new Date(offenerEinsatz.eingewechselt_um).getTime()) /
            1000
          : 0
        return {
          spieler: s,
          offenerEinsatz,
          gesamtSekunden: kumuliertSekunden + laufendSekunden,
        }
      })

    return liste.sort((a, b) => b.gesamtSekunden - a.gesamtSekunden)
  }

  function laengsterAktiverSpielerId(liste: Eintrag[]): string | null {
    const aktive = liste.filter((e) => e.offenerEinsatz)
    if (aktive.length === 0) return null
    return aktive.reduce((a, b) =>
      new Date(a.offenerEinsatz!.eingewechselt_um) <
      new Date(b.offenerEinsatz!.eingewechselt_um)
        ? a
        : b,
    ).spieler.id
  }

  async function handleEinwechseln(spielerId: string, zielFeldId: string) {
    setAktionFehler(null)
    const aktuelleZuteilung = zuteilung.find((z) => z.spieler_id === spielerId)

    // UC-05/A2 (FR-34)
    if (aktuelleZuteilung && aktuelleZuteilung.feld_id !== zielFeldId) {
      const eigenesFeld = felder.find(
        (f) => f.id === aktuelleZuteilung.feld_id,
      )?.bezeichnung
      const zielFeld = felder.find((f) => f.id === zielFeldId)?.bezeichnung
      const bestaetigt = confirm(
        `Spieler ist ${eigenesFeld} zugeteilt – auf ${zielFeld} einwechseln?`,
      )
      if (!bestaetigt) return
    }

    try {
      await einwechseln(feldIds, spielerId, zielFeldId)
      await laden()
    } catch {
      setAktionFehler('Keine Verbindung – bitte erneut versuchen.')
    }
  }

  async function handleAuswechseln(einsatzId: string) {
    setAktionFehler(null)
    try {
      await auswechseln(einsatzId)
      await laden()
    } catch {
      setAktionFehler('Keine Verbindung – bitte erneut versuchen.')
    }
  }

  async function handleSpielBeenden() {
    const gibtAktive = einsaetze.some((e) => e.ausgewechselt_um === null)
    const hinweis = gibtAktive
      ? 'Es sind noch Spieler aktiv auf dem Feld – Spiel wirklich beenden?'
      : 'Spiel wirklich beenden?'
    if (!confirm(hinweis)) return

    setAktionFehler(null)
    try {
      await spielBeenden(spiel.id, feldIds)
      await laden()
    } catch {
      setAktionFehler('Keine Verbindung – bitte erneut versuchen.')
    }
  }

  if (spiel.status === 'geplant') {
    return (
      <div>
        <Link
          to={`/turniere/${turnier.id}`}
          className="mb-4 inline-block text-sm text-slate-500"
        >
          ← {turnier.bezeichnung}
        </Link>
        <p className="rounded-lg bg-white p-4 text-sm text-slate-600 shadow-sm">
          Dieses Spiel ist noch nicht vorbereitet.{' '}
          <Link
            to={`/spiele/${spiel.id}/vorbereiten`}
            className="font-medium text-slate-900 underline"
          >
            Jetzt vorbereiten
          </Link>
        </p>
      </div>
    )
  }

  const beendet = spiel.status === 'beendet'

  return (
    <div>
      <Link
        to={`/turniere/${turnier.id}`}
        className="mb-4 inline-block text-sm text-slate-500"
      >
        ← {turnier.bezeichnung}
      </Link>
      <h1 className="mb-1 text-lg font-semibold text-slate-900">
        Spielzeit – Spiel {spiel.reihenfolge}
      </h1>
      <p className="mb-4 text-sm text-slate-500">
        {spiel.modus} · Status: {spiel.status}
      </p>

      {beendet && (
        <p className="mb-4 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-700">
          Spiel ist beendet – keine weiteren Wechsel möglich.
        </p>
      )}
      {aktionFehler && (
        <p className="mb-4 text-sm text-red-600">{aktionFehler}</p>
      )}

      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        {felder.map((feld) => {
          const eintraege = eintraegeFuerFeld(feld.id)
          const laengsterId = laengsterAktiverSpielerId(eintraege)

          return (
            <div key={feld.id} className="rounded-lg bg-white p-4 shadow-sm">
              <h2 className="mb-3 text-sm font-semibold text-slate-900">
                {feld.bezeichnung}
              </h2>
              <ul className="divide-y divide-slate-200">
                {eintraege.map((eintrag) => (
                  <li
                    key={eintrag.spieler.id}
                    className="flex items-center justify-between py-2"
                  >
                    <div>
                      <span>
                        {nameVon(eintrag.spieler)}
                        {eintrag.spieler.id === laengsterId && ' ⏱'}
                      </span>
                      <div className="text-xs text-slate-500">
                        {formatZeit(eintrag.gesamtSekunden)}
                        {eintrag.offenerEinsatz ? ' · aktiv' : ' · Bank'}
                      </div>
                    </div>
                    {!beendet &&
                      (eintrag.offenerEinsatz ? (
                        <button
                          onClick={() =>
                            handleAuswechseln(eintrag.offenerEinsatz!.id)
                          }
                          className="rounded-md border border-slate-300 px-3 py-1 text-sm font-medium text-slate-700"
                        >
                          Auswechseln
                        </button>
                      ) : (
                        <button
                          onClick={() =>
                            handleEinwechseln(eintrag.spieler.id, feld.id)
                          }
                          className="rounded-md bg-slate-900 px-3 py-1 text-sm font-medium text-white"
                        >
                          Einwechseln
                        </button>
                      ))}
                  </li>
                ))}
                {eintraege.length === 0 && (
                  <li className="py-2 text-sm text-slate-500">
                    Keine Spieler zugeteilt.
                  </li>
                )}
              </ul>
            </div>
          )
        })}
      </div>

      {!beendet && (
        <button
          onClick={handleSpielBeenden}
          className="rounded-md border border-red-300 px-4 py-2 text-base font-medium text-red-600"
        >
          Spiel beenden
        </button>
      )}
    </div>
  )
}
