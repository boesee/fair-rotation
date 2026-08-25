# Requirements-Katalog: Spielzeit-Rotation für Junioren-Fussballtraining

Abgeleitet aus `docs/vision.md`. Jede Anforderung ist auf ein Vision-Ziel
rückführbar (Spalte "Quelle"). Dieser Katalog ist die Grundlage für das
Entity-Modell und die Use-Case-Spezifikationen.

## Funktionale Anforderungen

### Zugriff & Sicherheit

| ID | Anforderung | Quelle (Vision) |
|---|---|---|
| FR-1 | Der Trainer kann sich mit einem Benutzerkonto (Username/Passwort) anmelden. Ohne Anmeldung sind keine Daten lesbar oder schreibbar. | Constraints: Zugriffsschutz |
| FR-2 | Der Trainer kann sich abmelden. | Constraints: Zugriffsschutz |

### Kaderverwaltung

| ID | Anforderung | Quelle (Vision) |
|---|---|---|
| FR-10 | Der Trainer kann einen Spieler zum Kader hinzufügen (Vorname, ggf. Nachname-Initiale). | Scope: Kaderverwaltung |
| FR-11 | Der Trainer kann einen Spieler im Kader bearbeiten. | Scope: Kaderverwaltung |
| FR-12 | Der Trainer kann einen Spieler aus dem Kader entfernen. | Scope: Kaderverwaltung |
| FR-13 | Der Kader bleibt dauerhaft gespeichert und steht bei jedem neuen Turnier/Spiel unverändert zur Verfügung. | Scope: Kaderverwaltung |

### Turnier- & Spielverwaltung

| ID | Anforderung | Quelle (Vision) |
|---|---|---|
| FR-20 | Der Trainer kann ein neues Turnier anlegen; ein Turnier umfasst immer 6 Spiele: 3 im Modus 3vs3 und 3 im Modus 6vs6. Die Reihenfolge der 6 Spiele wird beim Anlegen individuell festgelegt (variiert je Turnier). | Ziele: Turnier mit mehreren Spielen |
| FR-21 | Der Trainer kann innerhalb eines Turniers ein einzelnes Spiel auswählen/starten. | Ziele: pro Spiel separate Erfassung |
| FR-22 | Der Trainer kann vor Spielbeginn aus dem Kader die anwesenden Spieler markieren. | Ziele: Anwesenheit erfassen |
| FR-23 | Jedes Spiel hat einen fest zugeordneten Modus (3vs3 oder 6vs6), der beim Anlegen des Turniers pro Spiel festgelegt wird. Die Feldanzahl ergibt sich automatisch aus dem Modus: 3vs3 → 2 Felder (Team wird gesplittet), 6vs6 → 1 Feld (ganzes Team). Keine freie Feld-Wahl durch den Trainer. | Ziele: Spielmodus 3vs3/6vs6 (SFV Play More Football) |
| FR-24 | Bei einem 3vs3-Spiel teilt der Trainer jeden anwesenden Spieler manuell einem der zwei Felder zu (kein Automatik-Vorschlag). Bei einem 6vs6-Spiel entfällt dieser Schritt – alle anwesenden Spieler sind automatisch dem einen Feld zugeordnet. | Ziele: Feldzuteilung |
| FR-25 | Weicht die Zusammensetzung eines Turniers von 3× 3vs3 + 3× 6vs6 ab, zeigt die App eine Warnung – das Speichern wird dadurch nicht blockiert. | Entity-Modell: Konsistenzregel |

### Spielzeit-Erfassung

| ID | Anforderung | Quelle (Vision) |
|---|---|---|
| FR-30 | Der Trainer kann einen Spieler auf einem Feld einwechseln; der Timer für diesen Spieler startet. | Ziele: Timer pro Spieler |
| FR-31 | Der Trainer kann einen Spieler auf einem Feld auswechseln; der Timer stoppt, die Spielzeit wird kumuliert, und der Spieler gilt sofort wieder als verfügbar ("auf der Bank") für eine erneute Einwechslung. | Ziele: Timer pro Spieler |
| FR-32 | Der Trainer sieht pro Feld eine Übersicht aller zugeteilten Spieler, sortiert nach aktueller/kumulierter Spielzeit (längste zuerst). | Ziele: Übersicht je Feld |
| FR-33 | Die Übersicht kennzeichnet erkennbar, welcher Spieler aktuell am längsten ununterbrochen auf dem Feld steht. | Mission |

### Statistik & Auswertung

| ID | Anforderung | Quelle (Vision) |
|---|---|---|
| FR-40 | Der Trainer kann für ein einzelnes Turnier die kumulierte Spielzeit je Spieler einsehen. | Ziele: Statistik je Turnier |
| FR-41 | Der Trainer kann turnierübergreifend die kumulierte Spielzeit je Spieler einsehen. | Ziele: Statistik turnierübergreifend |
| FR-42 | Der Trainer kann die Anzahl Turnier-/Spielteilnahmen je Spieler einsehen. | Ziele: Teilnahme-Statistik |

## Nicht-funktionale Anforderungen

| ID | Anforderung | Quelle (Vision) |
|---|---|---|
| NFR-1 | Die Bedienung während des laufenden Spiels erfordert für Ein-/Auswechslungen möglichst wenige Taps (Ziel: ≤ 2). | Constraints: Bedienung unter Zeitdruck |
| NFR-2 | Die UI ist für die Nutzung auf einem iPhone (Safari, Hochformat) optimiert. | Constraints: Zielgerät iOS |
| NFR-3 | Persistenz erfolgt über Supabase (Postgres); die Datenbank ist Source of Truth, kein Datenverlust durch Browser-/Cache-Löschung. | Constraints: Persistenz |
| NFR-4 | Zugriffsschutz wird über Supabase Auth + Row Level Security auf Datenbankebene durchgesetzt, nicht nur clientseitig. | Constraints: Zugriffsschutz |
| NFR-5 | Ein GitHub-Actions-Workflow hält das Supabase-Free-Tier-Projekt durch periodische Requests aktiv (verhindert Auto-Pause nach 7 Tagen Inaktivität). | Constraints: Persistenz |
| NFR-6 | Es werden ausschliesslich Vorname + Nachname-Initiale gespeichert – keine vollständigen Namen oder weitere personenbezogene Daten. | Constraints: Datenschutz |
| NFR-7 | Das Frontend ist als statische Seite deploybar (GitHub Pages), ohne selbst betriebenen Server. | Constraints: Deployment |

## Offene Punkte für das Entity-Modell

Diese Anforderungen implizieren bereits eine grobe Entitätsstruktur, die im
nächsten Schritt (`docs/entity-model.md`) verfeinert wird:

- **Spieler** (Kader-Stammdaten)
- **Turnier** (gruppiert mehrere Spiele)
- **Spiel** (gehört zu einem Turnier; hat 1–2 Felder)
- **Feld** (gehört zu einem Spiel)
- **Anwesenheit** (Spieler × Spiel)
- **Einsatz** (Spieler × Feld × Zeitspanne – Basis für Timer & Statistik)
