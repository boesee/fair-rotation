import { supabase } from '../../lib/supabaseClient'

export type AbwesendGrund = 'kader_voll' | 'privat'

export interface Anwesenheit {
  id: string
  turnier_id: string
  spieler_id: string
  anwesend: boolean
  abwesend_grund: AbwesendGrund | null
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
// spiel-bezogenen Anwesenheit). abwesend_grund wird nur fuer nicht-anwesende
// Spieler gesetzt (sonst null) – unterscheidet FR-42b "Kader war voll"
// (zaehlt fuer die Kader-Fairness-Statistik) von "privat verhindert"
// (zaehlt nicht).
export async function speichereTurnierAnwesenheit(
  turnierId: string,
  spielerIds: string[],
  anwesenheitMap: Record<string, boolean>,
  grundMap: Record<string, AbwesendGrund>,
): Promise<void> {
  const rows = spielerIds.map((spielerId) => {
    const anwesend = anwesenheitMap[spielerId] ?? true
    return {
      turnier_id: turnierId,
      spieler_id: spielerId,
      anwesend,
      abwesend_grund: anwesend ? null : (grundMap[spielerId] ?? 'privat'),
    }
  })

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
