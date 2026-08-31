import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { listSpielerByIds, type Spieler } from '../kader/kaderApi'
import {
  getSpielMitTurnier,
  type Spiel,
  type Turnier,
} from '../turnier/turnierApi'
import {
  listRotationsblockMitglieder,
  listRotationsbloecke,
  loescheRotationsblock,
  speichereRotationsblock,
  type Rotationsblock,
} from '../turnier/rotationsblockApi'
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
  wechsleMehrere,
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
  // UX-Feedback: die Reihenfolge (FR-32) darf sich nicht mitten in einer
  // Aktion verschieben, nur weil der Live-Timer tickt – sonst landet der
  // Tap womöglich auf dem falschen Spieler. Reihenfolge wird deshalb nur bei
  // echten Datenänderungen (laden()) neu berechnet, nicht jede Sekunde; die
  // angezeigten Zeiten selbst ticken trotzdem live weiter.
  const [reihenfolge, setReihenfolge] = useState<Record<string, string[]>>({})

  const [ladeFehler, setLadeFehler] = useState<string | null>(null)
  const [aktionFehler, setAktionFehler] = useState<string | null>(null)
  const [mehrfachModus, setMehrfachModus] = useState(false)
  const [ausgewaehlt, setAusgewaehlt] = useState<Set<string>>(new Set())
  const [bloecke, setBloecke] = useState<Rotationsblock[]>([])
  const [blockMitglieder, setBlockMitglieder] = useState<Map<string, Set<string>>>(
    new Map(),
  )
  const [, setTick] = useState(0)

  function berechneGesamtSekunden(spielerId: string, einsaetzeStand: Einsatz[]): number {
    const eigene = einsaetzeStand.filter((e) => e.spieler_id === spielerId)
    const kumuliert = eigene
      .filter((e) => e.ausgewechselt_um !== null)
      .reduce(
        (sum, e) =>
          sum +
          (new Date(e.ausgewechselt_um as string).getTime() -
            new Date(e.eingewechselt_um).getTime()) /
            1000,
        0,
      )
    const offen = eigene.find((e) => e.ausgewechselt_um === null)
    const laufend = offen
      ? (Date.now() - new Date(offen.eingewechselt_um).getTime()) / 1000
      : 0
    return kumuliert + laufend
  }

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

      const bl = await listRotationsbloecke(d.turnier.id)
      const mitglieder = await listRotationsblockMitglieder(bl.map((b) => b.id))
      const neueBlockMitglieder = new Map<string, Set<string>>()
      bl.forEach((b) => neueBlockMitglieder.set(b.id, new Set()))
      mitglieder.forEach((m) => {
        neueBlockMitglieder.get(m.rotationsblock_id)?.add(m.spieler_id)
      })

      const neueReihenfolge: Record<string, string[]> = {}
      f.forEach((feld) => {
        neueReihenfolge[feld.id] = z
          .filter((x) => x.feld_id === feld.id)
          .map((x) => x.spieler_id)
          .sort((a, b) => berechneGesamtSekunden(b, e) - berechneGesamtSekunden(a, e))
      })

      setDaten(d)
      setFelder(f)
      setZuteilung(z)
      setEinsaetze(e)
      setSpieler(s)
      setReihenfolge(neueReihenfolge)
      setBloecke(bl)
      setBlockMitglieder(neueBlockMitglieder)
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

  if (ladeFehler)
    return <p className="text-sm text-red-600 dark:text-red-400">{ladeFehler}</p>
  if (!daten)
    return <p className="text-sm text-slate-500 dark:text-slate-400">Lädt…</p>

  const { spiel, turnier } = daten
  const feldIds = felder.map((f) => f.id)
  const spielerMap = new Map(spieler.map((s) => [s.id, s]))
  const nameVon = (s: Spieler) =>
    s.vorname + (s.nachname_initiale ? ` ${s.nachname_initiale}.` : '')

  function eintraegeFuerFeld(feldId: string): Eintrag[] {
    return (reihenfolge[feldId] ?? [])
      .map((spielerId) => spielerMap.get(spielerId))
      .filter((s): s is Spieler => s !== undefined)
      .map((s) => {
        const offenerEinsatz = einsaetze.find(
          (e) => e.spieler_id === s.id && e.ausgewechselt_um === null,
        )
        return {
          spieler: s,
          offenerEinsatz,
          gesamtSekunden: berechneGesamtSekunden(s.id, einsaetze),
        }
      })
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
    const istFeldwechsel = Boolean(
      aktuelleZuteilung && aktuelleZuteilung.feld_id !== zielFeldId,
    )

    // UC-05/A2 (FR-34)
    if (istFeldwechsel) {
      const eigenesFeld = felder.find(
        (f) => f.id === aktuelleZuteilung!.feld_id,
      )?.bezeichnung
      const zielFeld = felder.find((f) => f.id === zielFeldId)?.bezeichnung
      const bestaetigt = confirm(
        `Spieler ist ${eigenesFeld} zugeteilt – auf ${zielFeld} einwechseln?`,
      )
      if (!bestaetigt) return
    }

    try {
      await einwechseln(feldIds, spielerId, zielFeldId, istFeldwechsel)
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

  async function handleAlleEinwechseln() {
    setAktionFehler(null)
    const bankSpieler = zuteilung
      .filter(
        (z) =>
          !einsaetze.some(
            (e) => e.spieler_id === z.spieler_id && e.ausgewechselt_um === null,
          ),
      )
      .map((z) => ({ spielerId: z.spieler_id, feldId: z.feld_id }))

    if (bankSpieler.length === 0) return

    try {
      await wechsleMehrere([], bankSpieler)
      await laden()
    } catch {
      setAktionFehler('Keine Verbindung – bitte erneut versuchen.')
    }
  }

  function toggleMehrfachModus() {
    setAusgewaehlt(new Set())
    setMehrfachModus((v) => !v)
  }

  function toggleAuswahl(spielerId: string) {
    setAusgewaehlt((s) => {
      const neu = new Set(s)
      if (neu.has(spielerId)) neu.delete(spielerId)
      else neu.add(spielerId)
      return neu
    })
  }

  // FR-45: Block-Chip waehlt/entwaehlt alle Mitglieder auf einmal – spart
  // das erneute manuelle Anhaken derselben, ueber das Turnier stabilen
  // Rotationsgruppe bei jedem Spiel.
  function toggleBlock(blockId: string) {
    const mitglieder = blockMitglieder.get(blockId) ?? new Set()
    const alleAusgewaehlt = [...mitglieder].every((id) => ausgewaehlt.has(id))
    setAusgewaehlt((s) => {
      const neu = new Set(s)
      mitglieder.forEach((id) => {
        if (alleAusgewaehlt) neu.delete(id)
        else neu.add(id)
      })
      return neu
    })
  }

  async function handleAlsBlockSpeichern() {
    const name = prompt('Name für diesen Block (z.B. "Block A1"):')
    if (!name || name.trim().length === 0) return

    setAktionFehler(null)
    try {
      await speichereRotationsblock(turnier.id, name.trim(), [...ausgewaehlt])
      await laden()
    } catch {
      setAktionFehler('Keine Verbindung – bitte erneut versuchen.')
    }
  }

  async function handleBlockLoeschen(blockId: string, bezeichnung: string) {
    if (!confirm(`Block "${bezeichnung}" löschen?`)) return
    setAktionFehler(null)
    try {
      await loescheRotationsblock(blockId)
      await laden()
    } catch {
      setAktionFehler('Keine Verbindung – bitte erneut versuchen.')
    }
  }

  // Mehrfachauswahl-Blockwechsel (Feldtest-Feedback): mehrere Bank- und
  // aktive Spieler markieren, dann in einem Tap alle gleichzeitig tauschen
  // – statt jeden einzeln ein-/auszuwechseln.
  async function handleMehrereWechseln() {
    setAktionFehler(null)
    const auswechselnIds: string[] = []
    const einwechselnEintraege: { spielerId: string; feldId: string }[] = []

    for (const feld of felder) {
      for (const eintrag of eintraegeFuerFeld(feld.id)) {
        if (!ausgewaehlt.has(eintrag.spieler.id)) continue
        if (eintrag.offenerEinsatz) {
          auswechselnIds.push(eintrag.offenerEinsatz.id)
        } else {
          einwechselnEintraege.push({
            spielerId: eintrag.spieler.id,
            feldId: feld.id,
          })
        }
      }
    }
    if (auswechselnIds.length === 0 && einwechselnEintraege.length === 0) return

    try {
      await wechsleMehrere(auswechselnIds, einwechselnEintraege)
      setAusgewaehlt(new Set())
      setMehrfachModus(false)
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
          className="mb-4 inline-block text-sm text-slate-500 dark:text-slate-400"
        >
          ← {turnier.bezeichnung}
        </Link>
        <p className="rounded-lg bg-white p-4 text-sm text-slate-600 shadow-sm dark:bg-slate-800 dark:text-slate-300">
          Dieses Spiel ist noch nicht vorbereitet.{' '}
          <Link
            to={`/spiele/${spiel.id}/vorbereiten`}
            className="font-medium text-slate-900 underline dark:text-slate-100"
          >
            Jetzt vorbereiten
          </Link>
        </p>
      </div>
    )
  }

  const beendet = spiel.status === 'beendet'

  return (
    <div className={mehrfachModus ? 'pb-20' : undefined}>
      <Link
        to={`/turniere/${turnier.id}`}
        className="mb-4 inline-block text-sm text-slate-500 dark:text-slate-400"
      >
        ← {turnier.bezeichnung}
      </Link>
      <h1 className="mb-1 text-lg font-semibold text-slate-900 dark:text-slate-100">
        Spielzeit – Spiel {spiel.reihenfolge}
      </h1>
      <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
        {spiel.modus} · Status: {spiel.status}
      </p>

      {beendet && (
        <p className="mb-4 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
          Spiel ist beendet – keine weiteren Wechsel möglich.
        </p>
      )}
      {aktionFehler && (
        <p className="mb-4 text-sm text-red-600 dark:text-red-400">{aktionFehler}</p>
      )}

      {!beendet && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <button
            onClick={handleAlleEinwechseln}
            className="rounded-md bg-slate-900 px-4 py-2 text-base font-medium text-white"
          >
            Alle einwechseln
          </button>
          <button
            onClick={toggleMehrfachModus}
            className="rounded-md border border-slate-300 px-4 py-2 text-base font-medium text-slate-700 dark:border-slate-600 dark:text-slate-300"
          >
            {mehrfachModus ? 'Fertig' : 'Mehrere wechseln'}
          </button>
        </div>
      )}

      {mehrfachModus && bloecke.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {bloecke.map((block) => {
            const mitglieder = blockMitglieder.get(block.id) ?? new Set()
            const aktiv =
              mitglieder.size > 0 &&
              [...mitglieder].every((id) => ausgewaehlt.has(id))
            return (
              <span key={block.id} className="inline-flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => toggleBlock(block.id)}
                  className={`rounded-full border px-3 py-1 text-sm ${
                    aktiv
                      ? 'border-slate-900 bg-slate-900 text-white'
                      : 'border-slate-300 text-slate-700 dark:border-slate-600 dark:text-slate-300'
                  }`}
                >
                  {block.bezeichnung}
                </button>
                <button
                  type="button"
                  onClick={() => handleBlockLoeschen(block.id, block.bezeichnung)}
                  title={`Block "${block.bezeichnung}" löschen`}
                  className="px-1 text-slate-400 dark:text-slate-500"
                >
                  ×
                </button>
              </span>
            )
          })}
        </div>
      )}

      {felder.length > 1 && (
        <div className="mb-2 flex gap-4 text-sm">
          {felder.map((f) => (
            <a
              key={f.id}
              href={`#feld-${f.id}`}
              className="font-medium text-slate-700 underline dark:text-slate-300"
            >
              ↓ {f.bezeichnung}
            </a>
          ))}
        </div>
      )}

      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        {felder.map((feld) => {
          const eintraege = eintraegeFuerFeld(feld.id)
          const laengsterId = laengsterAktiverSpielerId(eintraege)

          return (
            <div
              key={feld.id}
              id={`feld-${feld.id}`}
              className="scroll-mt-4 rounded-lg bg-white p-4 shadow-sm dark:bg-slate-800"
            >
              <h2 className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-100">
                {feld.bezeichnung}
              </h2>
              <ul className="divide-y divide-slate-200 dark:divide-slate-700">
                {eintraege.map((eintrag) => {
                  const langsam = eintrag.spieler.id === laengsterId
                  return (
                    <li
                      key={eintrag.spieler.id}
                      className={`flex items-center justify-between gap-2 py-2 ${
                        langsam ? 'rounded-md bg-amber-50 px-2 dark:bg-amber-950/30' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div>
                          <span className="text-slate-900 dark:text-slate-100">
                            {nameVon(eintrag.spieler)}
                            {langsam && ' ⏱'}
                          </span>
                          <div className="text-xs text-slate-500 dark:text-slate-400">
                            {formatZeit(eintrag.gesamtSekunden)}
                            {eintrag.offenerEinsatz ? ' · aktiv' : ' · Bank'}
                          </div>
                        </div>
                      </div>
                      {!beendet &&
                        (mehrfachModus ? (
                          <input
                            type="checkbox"
                            checked={ausgewaehlt.has(eintrag.spieler.id)}
                            onChange={() => toggleAuswahl(eintrag.spieler.id)}
                            className="h-6 w-6"
                          />
                        ) : eintrag.offenerEinsatz ? (
                          <button
                            onClick={() =>
                              handleAuswechseln(eintrag.offenerEinsatz!.id)
                            }
                            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 dark:border-slate-600 dark:text-slate-300"
                          >
                            Auswechseln
                          </button>
                        ) : (
                          <button
                            onClick={() =>
                              handleEinwechseln(eintrag.spieler.id, feld.id)
                            }
                            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white"
                          >
                            Einwechseln
                          </button>
                        ))}
                    </li>
                  )
                })}
                {eintraege.length === 0 && (
                  <li className="py-2 text-sm text-slate-500 dark:text-slate-400">
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
          className="rounded-md border border-red-300 px-4 py-2 text-base font-medium text-red-600 dark:border-red-800 dark:text-red-400"
        >
          Spiel beenden
        </button>
      )}

      {mehrfachModus && ausgewaehlt.size > 0 && (
        <div className="fixed inset-x-4 bottom-4 z-10 flex gap-2 rounded-lg bg-slate-900 p-3 shadow-lg dark:bg-slate-700">
          <button
            onClick={handleMehrereWechseln}
            className="flex-1 rounded-md bg-white px-4 py-3 text-base font-medium text-slate-900"
          >
            {ausgewaehlt.size} wechseln
          </button>
          <button
            onClick={handleAlsBlockSpeichern}
            className="rounded-md border border-white px-4 py-3 text-base font-medium text-white"
          >
            Als Block speichern
          </button>
        </div>
      )}
    </div>
  )
}
