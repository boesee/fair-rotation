import { supabase } from '../../lib/supabaseClient'

export interface Rotationsblock {
  id: string
  turnier_id: string
  bezeichnung: string
}

export async function listRotationsbloecke(
  turnierId: string,
): Promise<Rotationsblock[]> {
  const { data, error } = await supabase
    .from('rotationsblock')
    .select('*')
    .eq('turnier_id', turnierId)
    .order('created_at')

  if (error) throw error
  return data
}

export async function listRotationsblockMitglieder(
  blockIds: string[],
): Promise<{ rotationsblock_id: string; spieler_id: string }[]> {
  if (blockIds.length === 0) return []
  const { data, error } = await supabase
    .from('rotationsblock_spieler')
    .select('rotationsblock_id, spieler_id')
    .in('rotationsblock_id', blockIds)

  if (error) throw error
  return data
}

// FR-45: speichert die aktuelle Mehrfachauswahl in UC-05 als wiederver-
// wendbaren, turnierweiten Block (modus-/feldunabhaengig).
export async function speichereRotationsblock(
  turnierId: string,
  bezeichnung: string,
  spielerIds: string[],
): Promise<void> {
  const { data: block, error: blockError } = await supabase
    .from('rotationsblock')
    .insert({ turnier_id: turnierId, bezeichnung })
    .select()
    .single()
  if (blockError) throw blockError

  if (spielerIds.length > 0) {
    const { error: mitgliederError } = await supabase
      .from('rotationsblock_spieler')
      .insert(
        spielerIds.map((spielerId) => ({
          rotationsblock_id: block.id,
          spieler_id: spielerId,
        })),
      )
    if (mitgliederError) throw mitgliederError
  }
}

export async function loescheRotationsblock(id: string): Promise<void> {
  const { error } = await supabase.from('rotationsblock').delete().eq('id', id)
  if (error) throw error
}
