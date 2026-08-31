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
  const stunden = Math.floor(s / 3600)
  const minuten = Math.floor((s % 3600) / 60)
  const rest = s % 60
  return `${stunden.toString().padStart(2, '0')}:${minuten.toString().padStart(2, '0')}:${rest.toString().padStart(2, '0')}`
}

// UC-05 Basic Flow + A2 (FR-30, FR-34): wechselt einen Spieler auf
// zielFeldId ein. istFeldwechsel wird vom Aufrufer anhand der bereits
// geladenen Zuteilung ermittelt (Ziel-Feld weicht von der aktuellen
// Zuteilung ab) – im weit haeufigeren Normalfall (kein Feldwechsel) spart
// das zwei Netzwerk-Roundtrips (Pruefung + Zuteilungs-Update), die im
// Feldtest als spuerbare Latenz aufgefallen sind.
export async function einwechseln(
  feldIdsDesSpiels: string[],
  spielerId: string,
  zielFeldId: string,
  istFeldwechsel: boolean,
): Promise<void> {
  const jetzt = new Date().toISOString()

  if (istFeldwechsel) {
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
  }

  const { error: insertError } = await supabase.from('einsatz').insert({
    feld_id: zielFeldId,
    spieler_id: spielerId,
    eingewechselt_um: jetzt,
  })
  if (insertError) throw insertError
}

// Mehrfachauswahl-Wechsel (Blockwechsel): schliesst mehrere offene
// Einsaetze und eroeffnet mehrere neue in je einem Bulk-Request, statt pro
// Spieler einzeln zu wechseln – deutlich weniger Taps und Roundtrips fuer
// den im Feldtest beobachteten Block-Rotationsablauf (z.B. 3er-Bloecke).
export async function wechsleMehrere(
  auswechselnEinsatzIds: string[],
  einwechseln: { spielerId: string; feldId: string }[],
): Promise<void> {
  const jetzt = new Date().toISOString()

  if (auswechselnEinsatzIds.length > 0) {
    const { error } = await supabase
      .from('einsatz')
      .update({ ausgewechselt_um: jetzt })
      .in('id', auswechselnEinsatzIds)
      .is('ausgewechselt_um', null)
    if (error) throw error
  }

  if (einwechseln.length > 0) {
    const { error } = await supabase.from('einsatz').insert(
      einwechseln.map(({ spielerId, feldId }) => ({
        feld_id: feldId,
        spieler_id: spielerId,
        eingewechselt_um: jetzt,
      })),
    )
    if (error) throw error
  }
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

// Admin-Korrekturwerkzeug (siehe TurnierAdminPage): manuelles Bearbeiten von
// Einsatz-Zeitpunkten, Loeschen und Nacherfassen fehlender Einsaetze. Bewusst
// ohne die Invarianten-Pruefungen aus einwechseln/wechsleMehrere (hoechstens
// ein offener Einsatz pro Spieler) – das ist hier gerade der Zweck des
// Werkzeugs, der Trainer korrigiert bewusst abweichende Faelle.
export async function updateEinsatzZeiten(
  id: string,
  eingewechseltUm: string,
  ausgewechseltUm: string | null,
): Promise<void> {
  const { error } = await supabase
    .from('einsatz')
    .update({ eingewechselt_um: eingewechseltUm, ausgewechselt_um: ausgewechseltUm })
    .eq('id', id)
  if (error) throw error
}

export async function loescheEinsatz(id: string): Promise<void> {
  const { error } = await supabase.from('einsatz').delete().eq('id', id)
  if (error) throw error
}

export async function fuegeEinsatzHinzu(
  feldId: string,
  spielerId: string,
  eingewechseltUm: string,
  ausgewechseltUm: string | null,
): Promise<void> {
  const { error } = await supabase.from('einsatz').insert({
    feld_id: feldId,
    spieler_id: spielerId,
    eingewechselt_um: eingewechseltUm,
    ausgewechselt_um: ausgewechseltUm,
  })
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
