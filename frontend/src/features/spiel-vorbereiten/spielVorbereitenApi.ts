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

// Convenience fuer 3vs3 (Feldtest-Feedback): die Team-Aufteilung bleibt
// ueber ein Turnier praktisch immer gleich, erneutes manuelles Zuteilen pro
// Spiel ist reine Doppelarbeit. Liefert einen Vorschlag spieler_id -> Feld-
// Bezeichnung ('Feld A'/'Feld B') aus dem zuletzt gespielten 3vs3-Spiel des
// Turniers mit vorhandener Zuteilung, oder null, wenn keins existiert.
export async function ladeZuteilungsVorschlag(
  turnierId: string,
  aktuellesSpielId: string,
): Promise<Record<string, string> | null> {
  const { data: spiele, error: spieleError } = await supabase
    .from('spiel')
    .select('id, reihenfolge')
    .eq('turnier_id', turnierId)
    .eq('modus', '3vs3')
    .neq('id', aktuellesSpielId)
    .order('reihenfolge', { ascending: false })
  if (spieleError) throw spieleError
  if (spiele.length === 0) return null

  const spielIds = spiele.map((s) => s.id)
  const { data: felder, error: felderError } = await supabase
    .from('feld')
    .select('id, spiel_id, bezeichnung')
    .in('spiel_id', spielIds)
  if (felderError) throw felderError
  if (felder.length === 0) return null

  const feldIds = felder.map((f) => f.id)
  const { data: zuteilungRows, error: zuteilungError } = await supabase
    .from('zuteilung')
    .select('feld_id, spieler_id')
    .in('feld_id', feldIds)
  if (zuteilungError) throw zuteilungError
  if (zuteilungRows.length === 0) return null

  const feldIdZuSpiel = new Map(felder.map((f) => [f.id, f.spiel_id]))
  const feldIdZuBezeichnung = new Map(felder.map((f) => [f.id, f.bezeichnung]))

  for (const s of spiele) {
    const rowsFuerSpiel = zuteilungRows.filter(
      (z) => feldIdZuSpiel.get(z.feld_id) === s.id,
    )
    if (rowsFuerSpiel.length === 0) continue

    const vorschlag: Record<string, string> = {}
    rowsFuerSpiel.forEach((z) => {
      const bezeichnung = feldIdZuBezeichnung.get(z.feld_id)
      if (bezeichnung) vorschlag[z.spieler_id] = bezeichnung
    })
    return vorschlag
  }
  return null
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
