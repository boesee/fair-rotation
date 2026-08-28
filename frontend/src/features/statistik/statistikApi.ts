import { supabase } from '../../lib/supabaseClient'
import { listAlleSpieler } from '../kader/kaderApi'
import type { Anwesenheit, Feld } from '../spiel-vorbereiten/spielVorbereitenApi'
import { listEinsaetze } from '../spielzeit/spielzeitApi'

export interface SpielerStatistik {
  spielerId: string
  name: string
  kumulierteSekunden: number
  anzahlAnwesend: number
  anzahlEingesetzt: number
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

async function listAnwesenheitFuerSpiele(
  spielIds: string[],
): Promise<Anwesenheit[]> {
  if (spielIds.length === 0) return []
  const { data, error } = await supabase
    .from('anwesenheit')
    .select('*')
    .in('spiel_id', spielIds)
    .eq('anwesend', true)

  if (error) throw error
  return data
}

// UC-06 (FR-40/41/42): aggregiert kumulierte Spielzeit und
// Teilnahme-Kennzahlen ausschliesslich auf Basis beendeter Spiele.
// turnierId gesetzt -> Basic Flow (ein Turnier), sonst A1 (turnierübergreifend).
export async function berechneStatistik(
  turnierId?: string,
): Promise<SpielerStatistik[]> {
  const spielIds = await listBeendeteSpielIds(turnierId)
  if (spielIds.length === 0) return []

  const [alleSpieler, felder, anwesenheit] = await Promise.all([
    listAlleSpieler(),
    listFelderFuerSpiele(spielIds),
    listAnwesenheitFuerSpiele(spielIds),
  ])
  const feldIds = felder.map((f) => f.id)
  const einsaetze = await listEinsaetze(feldIds)
  const feldIdZuSpielId = new Map(felder.map((f) => [f.id, f.spiel_id]))

  return alleSpieler
    .map((s) => {
      const eigeneAnwesenheit = anwesenheit.filter((a) => a.spieler_id === s.id)
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
      const spieleMitEinsatz = new Set(
        eigeneEinsaetze.map((e) => feldIdZuSpielId.get(e.feld_id)),
      )

      return {
        spielerId: s.id,
        name: s.vorname + (s.nachname_initiale ? ` ${s.nachname_initiale}.` : ''),
        kumulierteSekunden,
        anzahlAnwesend: eigeneAnwesenheit.length,
        anzahlEingesetzt: spieleMitEinsatz.size,
      }
    })
    .filter(
      (s) =>
        s.anzahlAnwesend > 0 || s.anzahlEingesetzt > 0 || s.kumulierteSekunden > 0,
    )
    .sort((a, b) => b.kumulierteSekunden - a.kumulierteSekunden)
}
