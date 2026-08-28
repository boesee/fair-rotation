import { supabase } from '../../lib/supabaseClient'

export interface Feld {
  id: string
  spiel_id: string
  bezeichnung: string
  created_at: string
}

export interface Anwesenheit {
  id: string
  spiel_id: string
  spieler_id: string
  anwesend: boolean
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

export async function listAnwesenheit(spielId: string): Promise<Anwesenheit[]> {
  const { data, error } = await supabase
    .from('anwesenheit')
    .select('*')
    .eq('spiel_id', spielId)

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
// existiert, darf die Vorbereitung (A2) noch bearbeitet werden.
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

// Speichert Anwesenheit + Feldzuteilung in einem Schritt (vereinfacht
// gegenueber dem Use-Case-Text, der zwei getrennte Bestaetigungen
// beschreibt) und setzt das Spiel auf `laufend`. Bestehende Zuteilungen der
// betroffenen Felder werden vorher geloescht und aus zuteilungMap neu
// aufgebaut, damit A2 (Anwesenheit/Zuteilung korrigieren) keine doppelten
// oder veralteten Zuteilung-Datensaetze hinterlaesst.
export async function speichereVorbereitung(
  spielId: string,
  feldIds: string[],
  spielerIds: string[],
  anwesenheitMap: Record<string, boolean>,
  zuteilungMap: Record<string, string>,
): Promise<void> {
  const anwesenheitRows = spielerIds.map((spielerId) => ({
    spiel_id: spielId,
    spieler_id: spielerId,
    anwesend: anwesenheitMap[spielerId] ?? false,
  }))
  const { error: anwesenheitError } = await supabase
    .from('anwesenheit')
    .upsert(anwesenheitRows, { onConflict: 'spiel_id,spieler_id' })
  if (anwesenheitError) throw anwesenheitError

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
