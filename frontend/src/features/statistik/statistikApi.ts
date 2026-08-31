import { supabase } from '../../lib/supabaseClient'
import { listAlleSpieler } from '../kader/kaderApi'
import type { Feld } from '../spiel-vorbereiten/spielVorbereitenApi'
import { listEinsaetze } from '../spielzeit/spielzeitApi'
import { berechneTurnierStatus, type SpielStatus } from '../turnier/turnierApi'

export interface SpielerStatistik {
  spielerId: string
  name: string
  kumulierteSekunden: number
  // Nur bei der turnieruebergreifenden Ansicht (turnierId nicht gesetzt)
  // ermittelt, sonst 0 (ohne fachliche Bedeutung fuer ein einzelnes Turnier).
  anzahlTurniereAnwesend: number
}

export interface TurnierKlassifizierung {
  abgeschlossenIds: string[]
  laufendAnzahl: number
  testAnzahl: number
}

// FR-29/FR-41: die turnieruebergreifende Statistik beruecksichtigt nur
// Turniere, die (a) nicht als Test markiert sind (FR-28) und (b) als Ganzes
// `beendet` sind (alle Spiele beendet, berechneTurnierStatus). Die
// Einzelturnier-Ansicht (turnierId gesetzt) ist davon nicht betroffen – dort
// bleiben bereits beendete Spiele eines noch laufenden Turniers sichtbar.
// Zaehlt zusaetzlich, wieviele Turniere deswegen ausgeschlossen wurden
// (UX-Feedback: Transparenz, warum eine Zahl niedriger wirkt als erwartet).
async function klassifiziereTurniere(): Promise<TurnierKlassifizierung> {
  const { data: turniere, error: turniereError } = await supabase
    .from('turnier')
    .select('id, ist_test')
  if (turniereError) throw turniereError

  const testAnzahl = turniere.filter((t) => t.ist_test).length
  const nichtTestIds = turniere.filter((t) => !t.ist_test).map((t) => t.id)
  if (nichtTestIds.length === 0) {
    return { abgeschlossenIds: [], laufendAnzahl: 0, testAnzahl }
  }

  const { data: spiele, error: spieleError } = await supabase
    .from('spiel')
    .select('turnier_id, status')
    .in('turnier_id', nichtTestIds)
  if (spieleError) throw spieleError

  const spieleProTurnier = new Map<string, { status: SpielStatus }[]>()
  spiele.forEach((s) => {
    const liste = spieleProTurnier.get(s.turnier_id) ?? []
    liste.push({ status: s.status })
    spieleProTurnier.set(s.turnier_id, liste)
  })

  const abgeschlossenIds = nichtTestIds.filter(
    (id) => berechneTurnierStatus(spieleProTurnier.get(id) ?? []) === 'beendet',
  )

  return {
    abgeschlossenIds,
    laufendAnzahl: nichtTestIds.length - abgeschlossenIds.length,
    testAnzahl,
  }
}

// Fuer die UI: wie viele Turniere fehlen in der turnieruebergreifenden
// Statistik und warum (noch nicht vollstaendig beendet bzw. Test-Turnier).
export async function ermittleAusschluesse(): Promise<{
  laufendAnzahl: number
  testAnzahl: number
}> {
  const { laufendAnzahl, testAnzahl } = await klassifiziereTurniere()
  return { laufendAnzahl, testAnzahl }
}

async function listBeendeteSpielIdsFuerTurnier(turnierId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('spiel')
    .select('id')
    .eq('status', 'beendet')
    .eq('turnier_id', turnierId)
  if (error) throw error
  return data.map((s) => s.id)
}

async function listBeendeteSpielIdsFuerTurniere(
  turnierIds: string[],
): Promise<string[]> {
  if (turnierIds.length === 0) return []
  const { data, error } = await supabase
    .from('spiel')
    .select('id')
    .eq('status', 'beendet')
    .in('turnier_id', turnierIds)
  if (error) throw error
  return data.map((s) => s.id)
}

async function listFelderFuerSpiele(spielIds: string[]): Promise<Feld[]> {
  if (spielIds.length === 0) return []
  const { data, error } = await supabase
    .from('feld')
    .select('*')
    .in('spiel_id', spielIds)

  if (error) throw error
  return data
}

// FR-42: zaehlt je Spieler, an wie vielen der beruecksichtigten (echten,
// vollstaendig beendeten) Turniere er als anwesend erfasst ist.
async function zaehleTurniereProSpieler(
  erlaubteTurnierIds: string[],
): Promise<Map<string, number>> {
  if (erlaubteTurnierIds.length === 0) return new Map()

  const { data, error } = await supabase
    .from('anwesenheit')
    .select('spieler_id, turnier_id')
    .eq('anwesend', true)
    .in('turnier_id', erlaubteTurnierIds)
  if (error) throw error

  const turniereProSpieler = new Map<string, Set<string>>()
  data.forEach((row) => {
    const turniere = turniereProSpieler.get(row.spieler_id) ?? new Set<string>()
    turniere.add(row.turnier_id)
    turniereProSpieler.set(row.spieler_id, turniere)
  })

  return new Map(
    [...turniereProSpieler].map(([spielerId, turniere]) => [
      spielerId,
      turniere.size,
    ]),
  )
}

// UC-06 (FR-40/41): aggregiert kumulierte Spielzeit ausschliesslich auf
// Basis beendeter Spiele. turnierId gesetzt -> Basic Flow (ein Turnier),
// sonst A1 (turnieruebergreifend, nur vollstaendig beendete Nicht-Test-
// Turniere, inkl. Anzahl Turniere mit Anwesenheit).
export async function berechneStatistik(
  turnierId?: string,
): Promise<SpielerStatistik[]> {
  let spielIds: string[]
  let anwesenheitZaehlung = new Map<string, number>()

  if (turnierId) {
    spielIds = await listBeendeteSpielIdsFuerTurnier(turnierId)
  } else {
    const { abgeschlossenIds } = await klassifiziereTurniere()
    ;[spielIds, anwesenheitZaehlung] = await Promise.all([
      listBeendeteSpielIdsFuerTurniere(abgeschlossenIds),
      zaehleTurniereProSpieler(abgeschlossenIds),
    ])
  }

  const [alleSpieler, felder] = await Promise.all([
    listAlleSpieler(),
    listFelderFuerSpiele(spielIds),
  ])
  const feldIds = felder.map((f) => f.id)
  const einsaetze = await listEinsaetze(feldIds)

  return alleSpieler
    .map((s) => {
      const eigeneEinsaetze = einsaetze.filter(
        (e) => e.spieler_id === s.id && e.ausgewechselt_um !== null,
      )
      const kumulierteSekunden = eigeneEinsaetze.reduce(
        (sum, e) =>
          sum +
          (new Date(e.ausgewechselt_um as string).getTime() -
            new Date(e.eingewechselt_um).getTime()) /
            1000,
        0,
      )

      return {
        spielerId: s.id,
        name: s.vorname + (s.nachname_initiale ? ` ${s.nachname_initiale}.` : ''),
        kumulierteSekunden,
        anzahlTurniereAnwesend: anwesenheitZaehlung.get(s.id) ?? 0,
      }
    })
    .filter((s) => s.kumulierteSekunden > 0 || s.anzahlTurniereAnwesend > 0)
    .sort((a, b) => b.kumulierteSekunden - a.kumulierteSekunden)
}
