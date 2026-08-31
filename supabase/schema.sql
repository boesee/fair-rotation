-- fair-rotation: Datenbankschema fuer Supabase (Postgres)
-- Manuell in den Supabase SQL Editor einfuegen und ausfuehren
-- (kein Supabase-CLI-Migrationsworkflow, siehe docs/architecture.md).

-- gen_random_uuid() ist ab Postgres 13 im Core verfuegbar; pgcrypto wird
-- hier trotzdem defensiv aktiviert, falls die Funktion in einer aelteren
-- Umgebung nur darueber bereitgestellt wird.
create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------
-- spieler
-- ---------------------------------------------------------------------
create table public.spieler (
  id                 uuid primary key default gen_random_uuid(),
  vorname            text not null,
  nachname_initiale  text,
  aktiv              boolean not null default true,
  created_at         timestamptz not null default now()
);

alter table public.spieler enable row level security;

create policy "authenticated full access" on public.spieler
  for all
  to authenticated
  using (true)
  with check (true);

-- ---------------------------------------------------------------------
-- turnier
-- ---------------------------------------------------------------------
create table public.turnier (
  id           uuid primary key default gen_random_uuid(),
  datum        date not null,
  bezeichnung  text not null,
  -- FR-28: markiert Test-Turniere, die ueber die UI komplett (inkl. Spiele/
  -- Zuteilungen/Einsaetze/Anwesenheit, per on-delete-cascade) geloescht
  -- werden duerfen. Echte Turniere sind ohne diese Markierung geschuetzt.
  ist_test     boolean not null default false,
  created_at   timestamptz not null default now()
);

alter table public.turnier enable row level security;

create policy "authenticated full access" on public.turnier
  for all
  to authenticated
  using (true)
  with check (true);

-- ---------------------------------------------------------------------
-- spiel
-- ---------------------------------------------------------------------
create table public.spiel (
  id           uuid primary key default gen_random_uuid(),
  turnier_id   uuid not null references public.turnier(id) on delete cascade,
  reihenfolge  int not null,
  modus        text not null check (modus in ('3vs3', '6vs6')),
  status       text not null default 'geplant'
                 check (status in ('geplant', 'laufend', 'beendet')),
  created_at   timestamptz not null default now()
);

alter table public.spiel enable row level security;

create policy "authenticated full access" on public.spiel
  for all
  to authenticated
  using (true)
  with check (true);

-- ---------------------------------------------------------------------
-- feld
-- ---------------------------------------------------------------------
create table public.feld (
  id           uuid primary key default gen_random_uuid(),
  spiel_id     uuid not null references public.spiel(id) on delete cascade,
  bezeichnung  text not null,
  created_at   timestamptz not null default now()
);

alter table public.feld enable row level security;

create policy "authenticated full access" on public.feld
  for all
  to authenticated
  using (true)
  with check (true);

-- ---------------------------------------------------------------------
-- anwesenheit
-- ---------------------------------------------------------------------
-- Turnier-bezogen, nicht spiel-bezogen: an einem Turniertag ist die
-- Anwesenheit i.d.R. ueber alle Spiele hinweg gleich, daher wird sie einmal
-- pro Turnier erfasst (jederzeit nachtraeglich aenderbar) statt pro Spiel
-- wiederholt. Die Feldzuteilung (siehe zuteilung) waehlt pro Spiel aus
-- dieser Turnier-weiten Liste aus.
create table public.anwesenheit (
  id              uuid primary key default gen_random_uuid(),
  turnier_id      uuid not null references public.turnier(id) on delete cascade,
  spieler_id      uuid not null references public.spieler(id) on delete restrict,
  anwesend        boolean not null,
  -- FR-42b: nur gesetzt, wenn anwesend = false. Unterscheidet Kader-
  -- Fairness-relevante Abwesenheit ('kader_voll') von rein privaten
  -- Gruenden, die nicht in die Kader-Auswahl-Statistik einfliessen sollen.
  abwesend_grund  text check (abwesend_grund in ('kader_voll', 'privat')),
  created_at      timestamptz not null default now(),
  unique (turnier_id, spieler_id)
);

alter table public.anwesenheit enable row level security;

create policy "authenticated full access" on public.anwesenheit
  for all
  to authenticated
  using (true)
  with check (true);

-- ---------------------------------------------------------------------
-- zuteilung
-- ---------------------------------------------------------------------
create table public.zuteilung (
  id          uuid primary key default gen_random_uuid(),
  feld_id     uuid not null references public.feld(id) on delete cascade,
  spieler_id  uuid not null references public.spieler(id) on delete restrict,
  created_at  timestamptz not null default now()
);

alter table public.zuteilung enable row level security;

create policy "authenticated full access" on public.zuteilung
  for all
  to authenticated
  using (true)
  with check (true);

-- Cross-Table-Unique (Entity-Modell: "ein Spieler ist pro Spiel hoechstens
-- einem Feld zugeteilt"). Postgres kennt kein natives Unique ueber eine
-- FK-Traversierung (zuteilung -> feld -> spiel), daher per Trigger geprueft
-- statt rein applikationsseitig (robuster gegen Bugs/Races im Frontend).
create or replace function public.zuteilung_pruefe_eindeutigkeit()
returns trigger
language plpgsql
as $$
declare
  v_spiel_id        uuid;
  v_konflikt_anzahl int;
begin
  select spiel_id into v_spiel_id
  from public.feld
  where id = new.feld_id;

  select count(*) into v_konflikt_anzahl
  from public.zuteilung z
  join public.feld f on f.id = z.feld_id
  where f.spiel_id = v_spiel_id
    and z.spieler_id = new.spieler_id
    and z.id <> new.id;

  if v_konflikt_anzahl > 0 then
    raise exception
      'Spieler % ist im Spiel % bereits einem Feld zugeteilt',
      new.spieler_id, v_spiel_id
      using errcode = '23505';
  end if;

  return new;
end;
$$;

create trigger zuteilung_eindeutigkeit
  before insert or update of feld_id, spieler_id on public.zuteilung
  for each row
  execute function public.zuteilung_pruefe_eindeutigkeit();

-- ---------------------------------------------------------------------
-- einsatz
-- ---------------------------------------------------------------------
create table public.einsatz (
  id                 uuid primary key default gen_random_uuid(),
  feld_id            uuid not null references public.feld(id) on delete cascade,
  spieler_id         uuid not null references public.spieler(id) on delete restrict,
  eingewechselt_um   timestamptz not null,
  ausgewechselt_um   timestamptz,
  created_at         timestamptz not null default now()
);

alter table public.einsatz enable row level security;

create policy "authenticated full access" on public.einsatz
  for all
  to authenticated
  using (true)
  with check (true);

-- Hinweis (bewusst nicht umgesetzt): die analoge Invariante "ein Spieler
-- hat maximal einen offenen Einsatz gleichzeitig ueber alle Felder eines
-- Spiels" (Nachbedingung UC-05) wird vorerst applikationsseitig geprueft,
-- um die Migration auf den einen in docs/architecture.md explizit offenen
-- Punkt (zuteilung) zu fokussieren.

-- ---------------------------------------------------------------------
-- rotationsblock / rotationsblock_spieler
-- ---------------------------------------------------------------------
-- FR-45: turnierweit wiederverwendbare, benannte Spielergruppen (z.B. feste
-- Rotationsbloecke bei mehreren Spielern gleichzeitig), die der Trainer
-- waehrend der Mehrfachauswahl in UC-05 einmal speichert und danach per
-- Tap statt erneuter manueller Auswahl abrufen kann. Bewusst freiform
-- (keine Bindung an Feld/Modus) - derselbe Block laesst sich sowohl bei
-- 3vs3 als auch 6vs6 verwenden, da die Zuteilung ohnehin pro Spiel/Feld
-- bereits feststeht.
create table public.rotationsblock (
  id           uuid primary key default gen_random_uuid(),
  turnier_id   uuid not null references public.turnier(id) on delete cascade,
  bezeichnung  text not null,
  created_at   timestamptz not null default now()
);

alter table public.rotationsblock enable row level security;

create policy "authenticated full access" on public.rotationsblock
  for all
  to authenticated
  using (true)
  with check (true);

create table public.rotationsblock_spieler (
  rotationsblock_id  uuid not null references public.rotationsblock(id) on delete cascade,
  spieler_id         uuid not null references public.spieler(id) on delete cascade,
  primary key (rotationsblock_id, spieler_id)
);

alter table public.rotationsblock_spieler enable row level security;

create policy "authenticated full access" on public.rotationsblock_spieler
  for all
  to authenticated
  using (true)
  with check (true);
