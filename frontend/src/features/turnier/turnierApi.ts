import { supabase } from '../../lib/supabaseClient'

export type Modus = '3vs3' | '6vs6'
export type SpielStatus = 'geplant' | 'laufend' | 'beendet'
export type TurnierStatus = SpielStatus

export interface Turnier {
  id: string
  datum: string
  bezeichnung: string
  ist_test: boolean
  created_at: string
}

export interface Spiel {
  id: string
  turnier_id: string
  reihenfolge: number
  modus: Modus
  status: SpielStatus
  created_at: string
}

export const MAX_SPIELE_PRO_TURNIER = 6

export async function listTurniere(): Promise<Turnier[]> {
  const { data, error } = await supabase
    .from('turnier')
    .select('*')
    .order('datum', { ascending: false })

  if (error) throw error
  return data
}

export async function createTurnier(
  datum: string,
  bezeichnung: string,
  istTest: boolean,
): Promise<Turnier> {
  const { data, error } = await supabase
    .from('turnier')
    .insert({ datum, bezeichnung, ist_test: istTest })
    .select()
    .single()

  if (error) throw error
  return data
}

// FR-28: nur fuer Test-Turniere zugaenglich (siehe TurnierDetailPage) – loescht
// per on-delete-cascade in supabase/schema.sql auch alle Spiele, Felder,
// Zuteilungen, Einsaetze und die Turnier-Anwesenheit in einem Request.
export async function loescheTurnier(id: string): Promise<void> {
  const { error } = await supabase.from('turnier').delete().eq('id', id)
  if (error) throw error
}

export async function getTurnier(id: string): Promise<Turnier> {
  const { data, error } = await supabase
    .from('turnier')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

export async function listSpiele(turnierId: string): Promise<Spiel[]> {
  const { data, error } = await supabase
    .from('spiel')
    .select('*')
    .eq('turnier_id', turnierId)
    .order('reihenfolge')

  if (error) throw error
  return data
}

export async function getSpielMitTurnier(
  spielId: string,
): Promise<{ spiel: Spiel; turnier: Turnier }> {
  const { data, error } = await supabase
    .from('spiel')
    .select('*, turnier(*)')
    .eq('id', spielId)
    .single()

  if (error) throw error
  const { turnier, ...spiel } = data as Spiel & { turnier: Turnier }
  return { spiel, turnier }
}

// UC-03/A1: Spiel hinzufuegen inkl. automatisch erzeugter Feld-Datensaetze
// (FR-23: 2 Felder bei 3vs3, 1 Feld bei 6vs6). UC-03/E1: bricht ab, wenn
// bereits MAX_SPIELE_PRO_TURNIER erreicht ist.
export async function addSpiel(turnierId: string, modus: Modus): Promise<Spiel> {
  const bestehende = await listSpiele(turnierId)
  if (bestehende.length >= MAX_SPIELE_PRO_TURNIER) {
    throw new Error('MAX_SPIELE_ERREICHT')
  }

  const naechsteReihenfolge =
    bestehende.reduce((max, s) => Math.max(max, s.reihenfolge), 0) + 1

  const { data: spiel, error } = await supabase
    .from('spiel')
    .insert({ turnier_id: turnierId, reihenfolge: naechsteReihenfolge, modus })
    .select()
    .single()

  if (error) throw error

  const feldBezeichnungen = modus === '3vs3' ? ['Feld A', 'Feld B'] : ['Feld']
  const { error: feldError } = await supabase.from('feld').insert(
    feldBezeichnungen.map((bezeichnung) => ({
      spiel_id: spiel.id,
      bezeichnung,
    })),
  )
  if (feldError) throw feldError

  return spiel
}

// UC-03/FR-26: vertauscht die Reihenfolge zweier noch nicht gestarteter
// Spiele (Aufruf-Stelle stellt sicher, dass beide Status `geplant` haben).
export async function tauscheReihenfolge(
  a: { id: string; reihenfolge: number },
  b: { id: string; reihenfolge: number },
): Promise<void> {
  const { error: aError } = await supabase
    .from('spiel')
    .update({ reihenfolge: b.reihenfolge })
    .eq('id', a.id)
  if (aError) throw aError

  const { error: bError } = await supabase
    .from('spiel')
    .update({ reihenfolge: a.reihenfolge })
    .eq('id', b.id)
  if (bError) throw bError
}

// FR-29: Turnier-Status wird nicht gespeichert, sondern automatisch aus dem
// Status seiner Spiele abgeleitet (analog zur berechneten Spielzeit, siehe
// docs/architecture.md §4.3 "Kein clientseitiges Caching") – dadurch immer
// konsistent, ohne eigenen DB-Trigger oder Schema-Migration.
export function berechneTurnierStatus(
  spiele: { status: SpielStatus }[],
): TurnierStatus {
  if (spiele.length === 0) return 'geplant'
  if (spiele.every((s) => s.status === 'beendet')) return 'beendet'
  if (spiele.some((s) => s.status !== 'geplant')) return 'laufend'
  return 'geplant'
}

export async function listSpielStatusAllerTurniere(): Promise<
  { turnier_id: string; status: SpielStatus }[]
> {
  const { data, error } = await supabase.from('spiel').select('turnier_id, status')
  if (error) throw error
  return data
}

// UC-03/A3 (FR-25): Warnung, wenn die Zusammenstellung von 3x 3vs3 + 3x
// 6vs6 abweicht, sobald alle 6 Spiele erfasst sind. Kein Blocker.
export function pruefeModusMix(spiele: Spiel[]): string | null {
  if (spiele.length < MAX_SPIELE_PRO_TURNIER) return null

  const anzahl3vs3 = spiele.filter((s) => s.modus === '3vs3').length
  const anzahl6vs6 = spiele.filter((s) => s.modus === '6vs6').length

  if (anzahl3vs3 === 3 && anzahl6vs6 === 3) return null

  return `Abweichende Zusammenstellung: ${anzahl3vs3}× 3vs3 und ${anzahl6vs6}× 6vs6 (erwartet: 3× 3vs3 + 3× 6vs6).`
}
