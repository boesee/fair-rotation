import { supabase } from '../../lib/supabaseClient'

export interface Anwesenheit {
  id: string
  turnier_id: string
  spieler_id: string
  anwesend: boolean
}

export async function listTurnierAnwesenheit(
  turnierId: string,
): Promise<Anwesenheit[]> {
  const { data, error } = await supabase
    .from('anwesenheit')
    .select('*')
    .eq('turnier_id', turnierId)

  if (error) throw error
  return data
}

// Turnier-weite Anwesenheit ist jederzeit nachtraeglich aenderbar (kein
// Bezug zu Spielen/Einsaetzen, daher kein Sperr-Zustand wie frueher bei der
// spiel-bezogenen Anwesenheit).
export async function speichereTurnierAnwesenheit(
  turnierId: string,
  spielerIds: string[],
  anwesenheitMap: Record<string, boolean>,
): Promise<void> {
  const rows = spielerIds.map((spielerId) => ({
    turnier_id: turnierId,
    spieler_id: spielerId,
    anwesend: anwesenheitMap[spielerId] ?? false,
  }))

  const { error } = await supabase
    .from('anwesenheit')
    .upsert(rows, { onConflict: 'turnier_id,spieler_id' })
  if (error) throw error
}

export async function listAnwesendeSpielerIds(
  turnierId: string,
): Promise<string[]> {
  const { data, error } = await supabase
    .from('anwesenheit')
    .select('spieler_id')
    .eq('turnier_id', turnierId)
    .eq('anwesend', true)

  if (error) throw error
  return data.map((r) => r.spieler_id)
}
