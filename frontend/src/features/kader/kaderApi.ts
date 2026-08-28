import { supabase } from '../../lib/supabaseClient'

export interface Spieler {
  id: string
  vorname: string
  nachname_initiale: string | null
  aktiv: boolean
  created_at: string
}

export async function listSpieler(aktiv: boolean): Promise<Spieler[]> {
  const { data, error } = await supabase
    .from('spieler')
    .select('*')
    .eq('aktiv', aktiv)
    .order('vorname')

  if (error) throw error
  return data
}

// UC-06: Statistik beruecksichtigt auch deaktivierte Spieler mit Historie.
export async function listAlleSpieler(): Promise<Spieler[]> {
  const { data, error } = await supabase.from('spieler').select('*').order('vorname')
  if (error) throw error
  return data
}

export async function listSpielerByIds(ids: string[]): Promise<Spieler[]> {
  if (ids.length === 0) return []
  const { data, error } = await supabase.from('spieler').select('*').in('id', ids)
  if (error) throw error
  return data
}

export async function addSpieler(
  vorname: string,
  nachnameInitiale: string | null,
): Promise<Spieler> {
  const { data, error } = await supabase
    .from('spieler')
    .insert({ vorname, nachname_initiale: nachnameInitiale, aktiv: true })
    .select()
    .single()

  if (error) throw error
  return data
}

export async function updateSpieler(
  id: string,
  vorname: string,
  nachnameInitiale: string | null,
): Promise<void> {
  const { error } = await supabase
    .from('spieler')
    .update({ vorname, nachname_initiale: nachnameInitiale })
    .eq('id', id)

  if (error) throw error
}

export async function setAktiv(id: string, aktiv: boolean): Promise<void> {
  const { error } = await supabase.from('spieler').update({ aktiv }).eq('id', id)
  if (error) throw error
}

// UC-02/E2: nicht-blockierende Warnung bei Namensgleichheit unter aktiven
// Spielern (gleicher Vorname + gleiche oder fehlende Initiale).
export async function findNamensdopplung(
  vorname: string,
  nachnameInitiale: string | null,
  excludeId?: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from('spieler')
    .select('id, nachname_initiale')
    .eq('aktiv', true)
    .ilike('vorname', vorname)

  if (error) throw error
  return data.some(
    (s) =>
      s.id !== excludeId &&
      (s.nachname_initiale ?? '') === (nachnameInitiale ?? ''),
  )
}
