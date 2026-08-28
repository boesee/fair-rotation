import { supabase } from '../../lib/supabaseClient'

export interface Feld {
  id: string
  spiel_id: string
  bezeichnung: string
  created_at: string
}

export interface Zuteilung {
  id: string
  feld_id: string
  spieler_id: string
}

export async function listFelder(spielId: string): Promise<Feld[]> {
  const { data, error } = await supabase
    .from('feld')
    .select('*')
    .eq('spiel_id', spielId)
    .order('bezeichnung')

  if (error) throw error
  return data
}

export async function listZuteilung(feldIds: string[]): Promise<Zuteilung[]> {
  if (feldIds.length === 0) return []
  const { data, error } = await supabase
    .from('zuteilung')
    .select('*')
    .in('feld_id', feldIds)

  if (error) throw error
  return data
}

// UC-04/E4: solange kein Einsatz fuer eines der Felder dieses Spiels
// existiert, darf die Zuteilung (A2) noch korrigiert werden.
export async function hatEinsaetze(feldIds: string[]): Promise<boolean> {
  if (feldIds.length === 0) return false
  const { data, error } = await supabase
    .from('einsatz')
    .select('id')
    .in('feld_id', feldIds)
    .limit(1)

  if (error) throw error
  return data.length > 0
}

// Speichert die Feldzuteilung (Kandidaten sind die turnier-weit anwesenden
// Spieler, siehe features/turnier/anwesenheitApi.ts) und setzt das Spiel auf
// `laufend`. Bestehende Zuteilungen der betroffenen Felder werden vorher
// geloescht und aus zuteilungMap neu aufgebaut, damit A2 (Zuteilung
// korrigieren) keine doppelten oder veralteten Datensaetze hinterlaesst.
export async function speichereZuteilung(
  spielId: string,
  feldIds: string[],
  zuteilungMap: Record<string, string>,
): Promise<void> {
  if (feldIds.length > 0) {
    const { error: deleteError } = await supabase
      .from('zuteilung')
      .delete()
      .in('feld_id', feldIds)
    if (deleteError) throw deleteError
  }

  const zuteilungRows = Object.entries(zuteilungMap).map(
    ([spielerId, feldId]) => ({ feld_id: feldId, spieler_id: spielerId }),
  )
  if (zuteilungRows.length > 0) {
    const { error: insertError } = await supabase
      .from('zuteilung')
      .insert(zuteilungRows)
    if (insertError) throw insertError
  }

  const { error: statusError } = await supabase
    .from('spiel')
    .update({ status: 'laufend' })
    .eq('id', spielId)
  if (statusError) throw statusError
}
