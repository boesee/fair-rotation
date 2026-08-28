import { supabase } from '../../lib/supabaseClient'
import { listAlleSpieler } from '../kader/kaderApi'
import type { Feld } from '../spiel-vorbereiten/spielVorbereitenApi'
import { listEinsaetze } from '../spielzeit/spielzeitApi'

export interface SpielerStatistik {
  spielerId: string
  name: string
  kumulierteSekunden: number
  // Nur bei der turnieruebergreifenden Ansicht (turnierId nicht gesetzt)
  // ermittelt, sonst 0 (ohne fachliche Bedeutung fuer ein einzelnes Turnier).
  anzahlTurniereAnwesend: number
}

async function listBeendeteSpielIds(turnierId?: string): Promise<string[]> {
  let query = supabase.from('spiel').select('id').eq('status', 'beendet')
  if (turnierId) query = query.eq('turnier_id', turnierId)

  const { data, error } = await query
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

// FR-42a (vereinfacht, siehe UC-06-Notiz): zaehlt Turniere mit Anwesenheit,
// unabhaengig vom Spiel-Status, da Anwesenheit turnier-weit erfasst wird
// (features/turnier/anwesenheitApi.ts) und kein reines Spiel-Ergebnis ist.
async function zaehleTurniereProSpieler(): Promise<Map<string, number>> {
  const { data, error } = await supabase
    .from('anwesenheit')
    .select('spieler_id, turnier_id')
    .eq('anwesend', true)
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
// sonst A1 (turnieruebergreifend, inkl. Anzahl Turniere mit Anwesenheit).
export async function berechneStatistik(
  turnierId?: string,
): Promise<SpielerStatistik[]> {
  const spielIds = await listBeendeteSpielIds(turnierId)

  const [alleSpieler, felder, anwesenheitZaehlung] = await Promise.all([
    listAlleSpieler(),
    listFelderFuerSpiele(spielIds),
    turnierId ? Promise.resolve(new Map<string, number>()) : zaehleTurniereProSpieler(),
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
