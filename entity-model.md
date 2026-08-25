# Entity-Modell: Spielzeit-Rotation für Junioren-Fussballtraining

Abgeleitet aus `docs/requirements.md`. Grundlage für die Supabase-
Tabellenstruktur und die Use-Case-Spezifikationen.

## Entitäten

### Spieler
Stammdaten des Kaders, unabhängig von Turnier/Spiel.

| Attribut | Typ | Beschreibung |
|---|---|---|
| id | UUID | Primärschlüssel |
| vorname | text | Pflichtfeld |
| nachname_initiale | text | Optional, nur bei Namensgleichheit nötig (FR-10) |
| aktiv | boolean | Für spätere Kader-Bereinigung, ohne Historie zu löschen |

### Turnier
Container für genau 6 Spiele.

| Attribut | Typ | Beschreibung |
|---|---|---|
| id | UUID | Primärschlüssel |
| datum | date | |
| bezeichnung | text | z.B. "Turnier Muri, Frühling 2027" |

### Spiel
Gehört zu genau einem Turnier. Ein Turnier hat genau 6 Spiele
(FR-20): 3× Modus `3vs3`, 3× Modus `6vs6`, Reihenfolge frei.

| Attribut | Typ | Beschreibung |
|---|---|---|
| id | UUID | Primärschlüssel |
| turnier_id | FK → Turnier | |
| reihenfolge | int | Position innerhalb des Turniers (1–6) |
| modus | enum(`3vs3`, `6vs6`) | Bestimmt Feldanzahl (FR-23) |
| status | enum(`geplant`, `laufend`, `beendet`) | Für UI-Steuerung |

*Konsistenzregel (Anwendungsebene, nicht zwingend DB-Constraint): pro
Turnier müssen genau 3 Spiele mit Modus `3vs3` und 3 mit `6vs6` existieren.*

### Feld
Gehört zu genau einem Spiel. Anzahl ergibt sich aus dem Modus des Spiels:
`3vs3` → 2 Zeilen, `6vs6` → 1 Zeile (wird beim Anlegen des Spiels
automatisch erzeugt, keine manuelle Feld-Erstellung durch den Trainer).

| Attribut | Typ | Beschreibung |
|---|---|---|
| id | UUID | Primärschlüssel |
| spiel_id | FK → Spiel | |
| bezeichnung | text | "Feld A" / "Feld B" bei 3vs3, "Feld" bei 6vs6 |

### Anwesenheit
Verknüpft Spieler × Spiel: wer ist bei diesem Spiel dabei (FR-22).
Getrennt von der Feldzuteilung, weil Anwesenheit vor der Zuteilung erfasst
wird und bei 6vs6 keine Zuteilung nötig ist.

| Attribut | Typ | Beschreibung |
|---|---|---|
| id | UUID | Primärschlüssel |
| spiel_id | FK → Spiel | |
| spieler_id | FK → Spieler | |
| anwesend | boolean | |

*Unique Constraint: (spiel_id, spieler_id) – ein Spieler ist pro Spiel
höchstens einmal erfasst.*

### Zuteilung
Verknüpft Spieler × Feld: nur bei 3vs3 explizit vom Trainer gesetzt
(FR-24). Bei 6vs6 wird nach Abschluss der Anwesenheitserfassung (UC-04)
automatisch für jeden anwesenden Spieler ein Eintrag auf das eine Feld
angelegt – nicht bereits beim Erzeugen des Spiels, da die Anwesenheit zu
diesem Zeitpunkt noch nicht bekannt ist.

| Attribut | Typ | Beschreibung |
|---|---|---|
| id | UUID | Primärschlüssel |
| feld_id | FK → Feld | |
| spieler_id | FK → Spieler | |

*Unique Constraint: (spiel_id über feld_id, spieler_id) – ein Spieler ist
pro Spiel höchstens einem Feld zugeteilt (nicht gleichzeitig auf zwei
Feldern gemeldet).*

### Einsatz
Die eigentliche Zeiterfassung: eine Zeile pro Ein-/Auswechsel-Vorgang
(FR-30/FR-31). Ein Spieler kann pro Spiel mehrfach ein-/ausgewechselt
werden (bestätigt: Spieler ist nach Auswechslung sofort wieder
einwechselbar) → 1:n-Beziehung, keine einzelne Zeitspanne pro Spieler/Feld.

| Attribut | Typ | Beschreibung |
|---|---|---|
| id | UUID | Primärschlüssel |
| feld_id | FK → Feld | |
| spieler_id | FK → Spieler | |
| eingewechselt_um | timestamptz | Gesetzt bei Einwechslung |
| ausgewechselt_um | timestamptz, nullable | NULL = Spieler aktuell auf dem Feld |

*Ableitungen (keine gespeicherten Felder, sondern berechnet):*
- *Laufende Spielzeit eines aktiven Einsatzes: `now() - eingewechselt_um`*
- *Kumulierte Spielzeit Spieler/Spiel: Summe aller `ausgewechselt_um -
  eingewechselt_um` je Spieler, plus laufender Einsatz falls vorhanden*
- *Kumulierte Spielzeit Spieler/Turnier bzw. turnierübergreifend (FR-40/
  FR-41): Aggregation über alle Einsätze aller Spiele*

## Beziehungsdiagramm (Übersicht)

```
Turnier 1──6 Spiel 1──1..2 Feld 1──n Zuteilung n──1 Spieler
                  │                    │
                  │                    │
                  1──n Anwesenheit n──1┘
                  │
                  1
                  │
              (über Feld)
                  │
                  n
               Einsatz n──1 Spieler
```

## Bestätigte Entscheidungen (vormals offene Fragen)

- **Konsistenzregel 3× 3vs3 + 3× 6vs6:** wird nur als Warnung angezeigt,
  nicht als Blocker – der Trainer kann ein Turnier auch bei Abweichung
  speichern (siehe FR-25).
- **Rotation bei 6vs6:** existiert genauso wie bei 3vs3 – der
  Einsatz-Mechanismus (Ein-/Auswechseln, Timer) ist modusunabhängig.
  Unterschied ist ausschliesslich die Feldanzahl (1 statt 2), nicht die
  Rotationslogik. Die Zuteilung-Entität bleibt bei 6vs6 trivial (alle
  Anwesenden gehören zum einzigen Feld); wer davon aktuell aktiv auf dem
  Feld steht, ergibt sich weiterhin ausschliesslich aus Einsatz.
