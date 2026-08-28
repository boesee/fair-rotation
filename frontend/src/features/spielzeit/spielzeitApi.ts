import { supabase } from '../../lib/supabaseClient'

export interface Einsatz {
  id: string
  feld_id: string
  spieler_id: string
  eingewechselt_um: string
  ausgewechselt_um: string | null
}

export async function listEinsaetze(feldIds: string[]): Promise<Einsatz[]> {
  if (feldIds.length === 0) return []
  const { data, error } = await supabase
    .from('einsatz')
    .select('*')
    .in('feld_id', feldIds)

  if (error) throw error
  return data
}

export function formatZeit(sekunden: number): string {
  const s = Math.max(0, Math.floor(sekunden))
  const minuten = Math.floor(s / 60)
  const rest = s % 60
  return `${minuten}:${rest.toString().padStart(2, '0')}`
}

// UC-05 Basic Flow + A2 (FR-30, FR-34): wechselt einen Spieler auf
// zielFeldId ein. Hat der Spieler noch einen offenen Einsatz auf einem
// anderen Feld dieses Spiels (Feldwechsel), wird dieser zuerst beendet;
// die Zuteilung wird auf das neue Feld nachgefuehrt, damit UC-04 und die
// Feld-Uebersicht konsistent bleiben.
export async function einwechseln(
  feldIdsDesSpiels: string[],
  spielerId: string,
  zielFeldId: string,
): Promise<void> {
  const jetzt = new Date().toISOString()

  const { data: offene, error: offeneError } = await supabase
    .from('einsatz')
    .select('id')
    .in('feld_id', feldIdsDesSpiels)
    .eq('spieler_id', spielerId)
    .is('ausgewechselt_um', null)
  if (offeneError) throw offeneError

  for (const e of offene) {
    const { error } = await supabase
      .from('einsatz')
      .update({ ausgewechselt_um: jetzt })
      .eq('id', e.id)
    if (error) throw error
  }

  const { error: zuteilungError } = await supabase
    .from('zuteilung')
    .update({ feld_id: zielFeldId })
    .eq('spieler_id', spielerId)
    .in('feld_id', feldIdsDesSpiels)
  if (zuteilungError) throw zuteilungError

  const { error: insertError } = await supabase.from('einsatz').insert({
    feld_id: zielFeldId,
    spieler_id: spielerId,
    eingewechselt_um: jetzt,
  })
  if (insertError) throw insertError
}

// Startet alle Bank-Spieler eines Spiels gleichzeitig (typischerweise zu
// Spielbeginn statt jeden Spieler einzeln einzuwechseln). spielerIds sind
// die noch nicht aktiven, aber einem Feld zugeteilten Spieler.
export async function alleEinwechseln(
  eintraege: { spielerId: string; feldId: string }[],
): Promise<void> {
  if (eintraege.length === 0) return
  const jetzt = new Date().toISOString()

  const { error } = await supabase.from('einsatz').insert(
    eintraege.map(({ spielerId, feldId }) => ({
      feld_id: feldId,
      spieler_id: spielerId,
      eingewechselt_um: jetzt,
    })),
  )
  if (error) throw error
}

// UC-05/A1 (FR-31)
export async function auswechseln(einsatzId: string): Promise<void> {
  const { error } = await supabase
    .from('einsatz')
    .update({ ausgewechselt_um: new Date().toISOString() })
    .eq('id', einsatzId)
    .is('ausgewechselt_um', null)
  if (error) throw error
}

// UC-05/A3 (FR-35): schliesst alle offenen Einsaetze und beendet das Spiel.
export async function spielBeenden(
  spielId: string,
  feldIds: string[],
): Promise<void> {
  const jetzt = new Date().toISOString()
  if (feldIds.length > 0) {
    const { error: einsatzError } = await supabase
      .from('einsatz')
      .update({ ausgewechselt_um: jetzt })
      .in('feld_id', feldIds)
      .is('ausgewechselt_um', null)
    if (einsatzError) throw einsatzError
  }

  const { error: statusError } = await supabase
    .from('spiel')
    .update({ status: 'beendet' })
    .eq('id', spielId)
  if (statusError) throw statusError
}
