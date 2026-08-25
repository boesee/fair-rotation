# Software Architecture Document: Spielzeit-Rotation für Junioren-Fussballturnier

Abgeleitet aus `docs/vision.md` (Constraints), `docs/requirements.md` (NFRs)
und `docs/entity-model.md`. Elaboration-Artefakt gemäss AIUP – Grundlage für
das Frontend-Gerüst und die Supabase-Datenbank (Construction-Phase).

## 1. Systemkontext

Einzelplatz-Anwendung: ein Trainer, ein iPhone, keine Mehrgeräte-Synchronisation
(Non-Goal, siehe vision.md). Es gibt bewusst keine Backend-Anwendung – die
gesamte Serverlogik wird von Supabase (Managed Postgres + Auth + Auto-REST)
übernommen.

```
┌─────────────────────────┐        HTTPS        ┌───────────────────────────┐
│  iPhone Safari           │ ───────────────────▶│  Supabase Projekt         │
│  Statisches Frontend     │                      │  - Auth (Email/Passwort) │
│  (React, aus GitHub      │ ◀─────────────────── │  - PostgREST (Data API)  │
│  Pages ausgeliefert)     │   JSON über REST      │  - Postgres + RLS         │
└─────────────────────────┘                      └───────────────────────────┘
           ▲
           │ statische Dateien (HTML/JS/CSS)
           │
┌─────────────────────────┐
│  GitHub Pages            │
│  (Hosting, kein Server)  │
└─────────────────────────┘

┌───────────────────────────┐        HTTPS (2×/Woche)      ┌───────────────────────────┐
│ GitHub Actions             │ ─────────────────────────────▶│  Supabase Projekt         │
│ Keepalive-Workflow         │                                │  (Data API Root-Route)   │
└───────────────────────────┘                                └───────────────────────────┘
```

Es gibt zwei unabhängige GitHub-Actions-Workflows im Repo:

- **Deploy** (neu, dieses Dokument): baut das Frontend und veröffentlicht es
  auf GitHub Pages.
- **Supabase Keepalive** (bereits umgesetzt, `.github/workflows/supabase-keepalive.yml`):
  hält das Free-Tier-Projekt aktiv (NFR-5). Unabhängig vom Deploy-Workflow.

## 2. Technologie-Stack

| Baustein | Wahl | Begründung |
|---|---|---|
| Frontend-Framework | React 18 + TypeScript | Grösstes Ökosystem, beste Unterstützung durch AI-Codegen (passt zu AIUP), `supabase-js` funktioniert identisch wie in jedem anderen Framework. |
| Build-Tool | Vite | Schneller Dev-Server, einfache GitHub-Pages-Integration über `base`-Config, keine Zusatzkonfiguration nötig. |
| Styling | Tailwind CSS | Utility-first, deckt sowohl Standard-Formulare/Buttons als auch die individuellen Kartenlayouts der Feld-Übersicht (Timer, Status-Badges) ab; Setup mit Vite minimal (PostCSS-Plugin). Ein klassenloses Framework (Pico.css/Water.css) wäre für Formulare ausreichend, gäbe aber keine Kontrolle über die custom Spielerkarten. |
| Backend-Client | `@supabase/supabase-js` | Offizieller Client für Auth + PostgREST-Zugriff, übernimmt Session-Handling (Token-Refresh, `localStorage`-Persistenz). |
| State-Management | React State/Context, kein externes State-Management | Einzelgerät, keine Realtime-Synchronisation zwischen Clients nötig (siehe Abschnitt 5) – der Mehraufwand einer State-Library (Redux/Zustand) ist nicht gerechtfertigt. |
| Hosting | GitHub Pages | Vorgabe (Constraint in vision.md), rein statisches Hosting ohne eigenen Server. |

## 3. Deployment-Architektur

Neuer Workflow `.github/workflows/deploy.yml` (Construction-Phase, noch zu
erstellen):

1. Trigger: Push auf `main` (Pfade unter `frontend/**`), zusätzlich `workflow_dispatch`.
2. `npm ci && npm run build` im Frontend-Verzeichnis.
3. Veröffentlichung von `dist/` via `actions/deploy-pages` auf GitHub Pages.

**Konfiguration zur Build-Zeit:** Vite bettet Umgebungsvariablen mit Prefix
`VITE_` zur Build-Zeit fest in das JS-Bundle ein. Benötigt werden
`VITE_SUPABASE_URL` und `VITE_SUPABASE_PUBLISHABLE_KEY`. Da diese Werte
ohnehin öffentlich im ausgelieferten Bundle landen (jeder Browser lädt sie),
werden sie als **GitHub Actions Repository Variables** hinterlegt, nicht als
Secrets – im Unterschied zum Secret Key des Keepalive-Workflows, der nie im
Frontend landen darf. Der eigentliche Zugriffsschutz erfolgt nicht durch
Geheimhaltung dieses Keys, sondern durch RLS (Abschnitt 4.2).

**Vite `base`-Pfad:** muss auf den Repo-Namen (`/fair-rotation/`) gesetzt
werden, da GitHub Pages für Projekt-Repos (nicht `<user>.github.io`) unter
einem Unterpfad ausliefert.

## 4. Datenarchitektur

### 4.1 Tabellen

Direkte Ableitung aus `docs/entity-model.md`, ein Postgres-Schema `public`:

| Tabelle | Wichtige Spalten | Beziehungen |
|---|---|---|
| `spieler` | `id uuid pk`, `vorname text`, `nachname_initiale text null`, `aktiv boolean default true` | – |
| `turnier` | `id uuid pk`, `datum date`, `bezeichnung text` | – |
| `spiel` | `id uuid pk`, `turnier_id fk→turnier`, `reihenfolge int`, `modus text check ('3vs3','6vs6')`, `status text check ('geplant','laufend','beendet') default 'geplant'` | n:1 Turnier |
| `feld` | `id uuid pk`, `spiel_id fk→spiel`, `bezeichnung text` | n:1 Spiel |
| `anwesenheit` | `id uuid pk`, `spiel_id fk→spiel`, `spieler_id fk→spieler`, `anwesend boolean` | unique(`spiel_id`, `spieler_id`) |
| `zuteilung` | `id uuid pk`, `feld_id fk→feld`, `spieler_id fk→spieler` | unique(`spieler_id`, über `feld_id`→`spiel_id`) – Constraint wird applikationsseitig geprüft, da Postgres kein natives Cross-Table-Unique kennt |
| `einsatz` | `id uuid pk`, `feld_id fk→feld`, `spieler_id fk→spieler`, `eingewechselt_um timestamptz`, `ausgewechselt_um timestamptz null` | – |

Alle Tabellen: `created_at timestamptz default now()`. Keine `updated_at`-Spalten
nötig, da keine Historisierung gefordert ist.

### 4.2 Sicherheitsmodell (NFR-4)

RLS ist auf **allen** Tabellen aktiviert. Da es genau einen Benutzer gibt
(den Trainer), ist keine zeilenweise Eigentümer-Logik nötig – die Policy ist
für jede Tabelle identisch:

```sql
alter table <tabelle> enable row level security;

create policy "authenticated full access" on <tabelle>
  for all
  to authenticated
  using (true)
  with check (true);
```

Die `anon`-Rolle (nicht eingeloggte Requests, inkl. Requests mit dem
Publishable Key ohne gültige Session) erhält **keine** Policy und damit keinen
Zugriff. Das setzt FR-1 durch: ohne Anmeldung sind keine Daten lesbar oder
schreibbar, unabhängig davon, dass der Publishable Key öffentlich im Bundle
liegt.

### 4.3 Berechnete Werte

Laufende und kumulierte Spielzeit (FR-32/33, UC-05/06) werden **nicht** in
der Datenbank vorberechnet, sondern:

- **Laufende Spielzeit** eines aktiven Einsatzes: rein clientseitig berechnet
  als `now() - eingewechselt_um`, per 1-Sekunden-Interval im Frontend neu
  gerendert. Kein Round-Trip zum Server nötig, keine Server-Uhr-Synchronisation
  erforderlich, da nur ein Gerät involviert ist.
- **Kumulierte Spielzeit / Statistik** (UC-06): Aggregation per SQL-View
  (`select sum(...)`) oder Postgres-Funktion, über PostgREST als View
  abfragbar. Wird bei Bedarf beim Öffnen der Statistik-Ansicht berechnet, nicht
  laufend aktualisiert (UC-06 ist ohnehin nur für abgeschlossene Spiele
  relevant, siehe FR-40/41).

## 5. Kein Realtime, keine Offline-Fähigkeit

Bewusster Verzicht auf Supabase Realtime (WebSocket-Subscriptions) und auf
PWA/Service-Worker-Offline-Support: beides adressiert Mehrgeräte- bzw.
Netzausfall-Szenarien, die laut vision.md explizit Non-Goals sind
(Einzelplatz-Nutzung, Netzabdeckung wird vorausgesetzt). Jede Mutation
(Ein-/Auswechseln etc.) löst einen direkten REST-Request aus; der
UI-State wird optimistisch aktualisiert und bei Fehler zurückgerollt.

## 6. Auth-Architektur (FR-1, FR-2)

- Supabase Auth, Provider Email/Passwort. Der in FR-1 genannte "Benutzername"
  wird technisch als E-Mail-Adresse geführt (Supabase-Auth-Standard); das
  Login-Formular kann das Feld dennoch als "Benutzername" beschriften.
- **Kein Self-Signup** in der App: Es gibt genau einen Trainer-Account, der
  einmalig manuell im Supabase-Dashboard angelegt wird. Die App bietet nur
  einen Login-, keinen Registrierungs-Screen.
- Session-Persistenz übernimmt `supabase-js` automatisch über `localStorage`
  (Standardverhalten); kein zusätzlicher Code nötig, erfüllt implizit
  "Trainer bleibt zwischen Spielen eingeloggt".
- Logout (FR-2): `supabase.auth.signOut()`, danach Redirect auf Login-Screen.

## 7. Grobe Frontend-Struktur

Orientiert an den Use Cases (UC-01 bis UC-06), keine feingranulare
Ordnerstruktur an dieser Stelle – Detailplanung ist Teil des Frontend-Gerüsts:

```
frontend/
  src/
    lib/supabaseClient.ts       # Supabase-Client-Init (VITE_-Env-Vars)
    features/
      auth/                     # UC-01
      kader/                    # UC-02
      turnier/                  # UC-03
      spiel-vorbereiten/        # UC-04
      spielzeit/                # UC-05 (Timer-Logik, Feld-Übersicht)
      statistik/                # UC-06
    App.tsx                     # Routing (Login-Gate + Views)
```

## 8. Bezug zu Non-Functional Requirements

| NFR | Architekturentscheid |
|---|---|
| NFR-1 (≤2 Taps) | Ein-/Auswechseln als einzelner Tap auf Spielerkarte in der Feld-Übersicht, kein Zwischendialog. |
| NFR-2 (iPhone Safari, Hochformat) | Kein Cross-Device-Testing/Responsive-Grid nötig; Layout gezielt für ein Viewport-Profil. |
| NFR-3 (Supabase = Source of Truth) | Kein clientseitiges Caching über die laufende Session hinaus; jede Mutation schreibt sofort in Postgres. |
| NFR-4 (RLS statt nur UI-Schutz) | Abschnitt 4.2. |
| NFR-5 (Keepalive) | Bereits umgesetzt, siehe Abschnitt 1. |
| NFR-6 (minimale Personendaten) | Kein zusätzliches Feld über `vorname`/`nachname_initiale` hinaus im Schema (Abschnitt 4.1). |
| NFR-7 (statisches Deployment) | Abschnitt 3. |

## 9. Offene Punkte für die Construction-Phase

- Genaue SQL-Migration (DDL) für die Tabellen aus Abschnitt 4.1 inkl. RLS-Policies.
- UI-Mockups / Supplementary Specifications pro Use Case (Construction-Artefakt, noch offen).
- Cross-Table-Unique für `zuteilung` (ein Spieler nicht gleichzeitig auf zwei
  Feldern desselben Spiels) – Umsetzung entweder per Trigger oder rein
  applikationsseitig geprüft; Entscheid bei der Migration zu treffen.
