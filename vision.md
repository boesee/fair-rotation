# Vision: Spielzeit-Rotation für Junioren-Fussballtraining

## Mission

Als Co-Trainer eines E-Junioren-Teams soll eine leichte Web-App dabei helfen,
während eines Spiels oder Turniers eine **faire Spielzeit-Rotation**
umzusetzen. Insbesondere bei Turnieren mit mehreren parallel bespielten
Feldern verliert man leicht den Überblick, welcher Spieler am längsten
ununterbrochen auf dem Feld steht und als Nächstes ausgewechselt werden
sollte. Die App macht diese Information auf einen Blick sichtbar.

## Zielgruppe / Akteure

- **Trainer** (primärer Akteur): bedient die App allein, auf seinem eigenen
  Mobiltelefon, während er das Spiel/Turnier begleitet.

## Ziele

- Der Trainer sieht jederzeit auf einen Blick, welcher Spieler aktuell am
  längsten am Stück auf dem Feld steht.
- Ein-/Auswechslungen lassen sich während des laufenden Spiels schnell und
  mit minimaler Ablenkung erfassen.
- Der Spielerkader wird einmal angelegt und über mehrere Spiele/Turniere
  hinweg wiederverwendet.
- Ein Turnier besteht aus mehreren Spielen (typischerweise 4 oder 6); pro
  Spiel werden Anwesenheit, Feldzuteilung und Spielzeit separat erfasst und
  auf Turnierebene aggregiert.
- Vor jedem Spiel wird aus dem Kader erfasst, wer anwesend ist; nur
  anwesende Spieler werden den Feldern zugeteilt.
- Zu Beginn eines Spiels kann gewählt werden, ob das Team auf einem oder auf
  zwei Feldern gleichzeitig antritt; die anwesenden Spieler werden den
  Feldern zugeteilt.
- Pro Spieler läuft ein eigener Timer, der bei Einwechslung startet und bei
  Auswechslung stoppt (kumulierte Spielzeit bleibt sichtbar).
- Statistische Auswertung der Spielzeit pro Spieler – je Turnier und
  turnierübergreifend – sowie Anzahl Turnier-/Spielteilnahmen pro Spieler.

## Scope

- Kaderverwaltung: Spieler anlegen, bearbeiten, löschen; dauerhafte
  Speicherung in der Datenbank (Supabase).
- Vorbereitung pro Spiel: Anwesenheit erfassen, Auswahl 1 oder 2 Felder,
  Zuteilung der anwesenden Spieler zu Feldern.
- Spielzeit-Erfassung: Ein-/Auswechseln einzelner Spieler, Timer pro Spieler
  je Feld, laufende und kumulierte Spielzeit pro Spiel.
- Turnierverwaltung: ein Turnier gruppiert mehrere Spiele (4 oder 6); Daten
  bleiben pro Spiel granular erfasst und werden auf Turnierebene aggregiert.
- Übersicht je Feld, sortiert nach aktueller/kumulierter Spielzeit, um den
  nächsten fälligen Wechsel schnell zu erkennen.
- Statistik-Ansicht: kumulierte Spielzeit und Teilnahmen pro Spieler, je
  Turnier und turnierübergreifend.
- Zugriffsschutz: Login (ein Benutzerkonto für den Trainer) schützt Kader-,
  Turnier- und Spielerdaten vor Zugriff über die öffentlich erreichbare
  Frontend-URL.

## Non-Goals (bewusst ausserhalb des Scopes)

- Kein Spielstand-Tracking (Tore, Karten, Ereignisse).
- Kein Teilen/Synchronisieren mit anderen Trainern, Eltern oder Geräten –
  Einzelplatz-Nutzung auf dem Gerät des Trainers.
- Keine Offline-Fähigkeit (PWA/Service Worker) – Netzabdeckung am Spielfeld
  wird als ausreichend vorausgesetzt.
- Keine Vereins-/Mehrteam-Verwaltung im ersten Wurf – ein Kader.

## Constraints

- Deployment: statisches Frontend (weiterhin als GitHub Page im
  bestehenden Repo des Trainers deploybar); Persistenz über **Supabase
  (Postgres, Free Tier)** als Managed-Service-Backend – kein selbst
  betriebener/administrierter Server. Begründung: relationales Modell passt
  zu Turnier→Spiel→Einsatz, robust gegen Datenverlust durch Cache-Leeren
  (Server ist Source of Truth).
- Zielgerät: iPhone/iOS (Safari); primäres und einziges Nutzungsgerät.
- Ergänzt durch einen **GitHub-Actions-Keepalive-Workflow** (Cron, alle 3
  Tage ein Request an die Supabase-API), um das automatische Pausieren des
  Free-Tier-Projekts bei Inaktivität (>7 Tage) zu verhindern.
- **Datenschutz:** Es werden ausschliesslich Vorname + Nachname-Initiale
  erfasst, keine vollständigen Nachnamen oder weitere personenbezogene
  Daten. Speicherung/Auswertung dieser minimalen Daten sowie ihre Ablage in
  einer (potenziell öffentlich einsehbaren) Datenbank wird als
  akzeptables Risiko eingestuft (bewusste Abwägung des Trainers).
- **Zugriffsschutz:** Supabase Auth mit einem einzelnen Benutzerkonto
  (Trainer); Durchsetzung über Row Level Security (RLS) auf Datenbankebene,
  nicht nur clientseitig – da der Supabase-`anon`-Key im öffentlichen
  Frontend-Code liegt, ist RLS der eigentliche Schutzmechanismus, der
  Login-Screen in der UI allein reicht nicht aus.
- Bedienung durch eine einzelne Person unter Zeitdruck während des laufenden
  Spiels – die UI muss auf dem Mobiltelefon mit wenigen Taps bedienbar sein.
