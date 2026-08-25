# UC-04: Spiel vorbereiten

**Abgedeckte Anforderungen:** FR-22, FR-24, FR-27

## Kurzbeschreibung

Vor Beginn eines Spiels erfasst der Trainer, welche Kaderspieler anwesend
sind. Bei einem 3vs3-Spiel teilt er die anwesenden Spieler danach manuell
auf die zwei Felder auf; bei einem 6vs6-Spiel entfällt dieser Schritt, da
nur ein Feld existiert – alle anwesenden Spieler werden diesem automatisch
zugeordnet. Erst nach Abschluss dieser Vorbereitung gilt das Spiel als
bereit für die eigentliche Spielzeit-Erfassung (UC-05).

## Primärer Akteur

Trainer

## Vorbedingungen

- Der Trainer ist angemeldet (UC-01).
- Ein Spiel mit Status `geplant` existiert innerhalb eines Turniers
  (UC-03), inklusive der zum Modus passenden Feld-Datensätze.

## Nachbedingungen (Erfolg)

- Für jeden aktiven Kaderspieler ist ein Anwesenheit-Datensatz für dieses
  Spiel erfasst (anwesend = true/false).
- Jeder anwesende Spieler ist genau einem Feld dieses Spiels zugeteilt
  (bei 3vs3 manuell, bei 6vs6 automatisch).
- Der Status des Spiels wechselt von `geplant` zu `laufend`.
- Solange noch kein Einsatz-Datensatz für dieses Spiel existiert, bleibt
  eine Korrektur über A2 möglich (Status `laufend` allein blockiert das
  noch nicht).

## Hauptablauf (Basic Flow) – Spiel mit Modus 3vs3

1. Der Trainer wählt aus der Turnierübersicht ein Spiel mit Status
   `geplant`.
2. Die App zeigt die Liste der aktiven Kaderspieler, jeweils mit einer
   Markierung "anwesend".
3. Der Trainer markiert alle anwesenden Spieler.
4. Der Trainer bestätigt die Anwesenheit.
5. Die App speichert für jeden aktiven Kaderspieler einen
   Anwesenheit-Datensatz (FR-22).
6. Da der Modus des Spiels 3vs3 ist, zeigt die App die anwesenden Spieler
   zur Feldzuteilung (Feld A / Feld B).
7. Der Trainer teilt jeden anwesenden Spieler manuell einem der zwei
   Felder zu (FR-24).
8. Der Trainer bestätigt die Zuteilung.
9. Die App speichert die Zuteilung-Datensätze und setzt den Status des
   Spiels auf `laufend`.
10. Die App zeigt die Spielübersicht mit den zwei Feldern und den
    zugeteilten Spielern – Ausgangspunkt für UC-05.

## Alternativabläufe

**A1 – Spiel mit Modus 6vs6 (automatische Zuteilung)**
Bei Schritt 6 des Basic Flow: Der Modus des Spiels ist 6vs6.
1. Die App überspringt die manuelle Feldzuteilung.
2. Die App erstellt automatisch für jeden anwesenden Spieler einen
   Zuteilung-Datensatz auf das eine vorhandene Feld.
3. Die App setzt den Status des Spiels auf `laufend`.
4. Weiter bei Schritt 10 des Basic Flow.

**A2 – Vorbereitung korrigieren (FR-27)**
Solange für dieses Spiel noch kein Einsatz-Datensatz existiert (auch wenn
der Status bereits `laufend` ist), kann der Trainer zur Vorbereitung
zurückkehren:
1. Der Trainer öffnet das Spiel erneut und wählt "Anwesenheit/Zuteilung
   bearbeiten".
2. Die App zeigt die bisherige Anwesenheit und Zuteilung vorausgefüllt.
3. Der Trainer passt Anwesenheit und/oder Zuteilung an (z.B. Spieler
   nachträglich als anwesend markieren, Feld wechseln).
4. Der Trainer bestätigt.
5. Die App aktualisiert die betroffenen Datensätze entsprechend (bei
   6vs6 wird die automatische Zuteilung für neu als anwesend markierte
   Spieler entsprechend nachgeführt).

## Ausnahmeabläufe

**E1 – Keine anwesenden Spieler markiert**
Bei Schritt 4 des Basic Flow: Kein Spieler ist als anwesend markiert.
1. Die App verhindert das Bestätigen und weist darauf hin, dass
   mindestens ein Spieler anwesend sein muss.

**E2 – Nicht alle anwesenden Spieler einem Feld zugeteilt (nur 3vs3)**
Bei Schritt 8 des Basic Flow: Mindestens ein anwesender Spieler ist noch
keinem Feld zugeteilt.
1. Die App verhindert das Bestätigen und markiert die nicht zugeteilten
   Spieler.

**E3 – Netzwerkfehler**
Bei jedem Speichervorgang: Supabase nicht erreichbar.
1. Die App zeigt eine Fehlermeldung, bisherige Eingaben bleiben erhalten,
   der Trainer kann erneut speichern.

**E4 – Korrekturversuch nach Spielbeginn**
Bei Schritt 1 von A2: Für dieses Spiel existiert bereits mindestens ein
Einsatz-Datensatz (mindestens eine Ein-/Auswechslung wurde bereits
erfasst).
1. Die App verhindert die Bearbeitung und weist darauf hin, dass das
   Spiel bereits läuft und Anwesenheit/Zuteilung nicht mehr geändert
   werden können.

## Testfälle

| # | Szenario | Erwartetes Ergebnis |
|---|---|---|
| T1 | Bei einem 3vs3-Spiel 5 Spieler als anwesend markieren und auf Feld A/B verteilen | Anwesenheit und Zuteilung gespeichert, Status wechselt zu `laufend` (Basic Flow) |
| T2 | Bei einem 6vs6-Spiel 8 Spieler als anwesend markieren | Anwesenheit gespeichert, alle 8 automatisch dem einen Feld zugeteilt, kein manueller Zuteilungsschritt sichtbar (A1) |
| T3 | Anwesenheit bestätigen, ohne einen Spieler zu markieren | Bestätigen wird verhindert (E1) |
| T4 | Bei 3vs3 einen anwesenden Spieler keinem Feld zuteilen und bestätigen | Bestätigen wird verhindert, nicht zugeteilter Spieler markiert (E2) |
| T5 | Nach abgeschlossener Vorbereitung (Status `laufend`, noch kein Einsatz) einen zusätzlichen Spieler als anwesend nachtragen | Anwesenheit wird aktualisiert, Spieler kann anschliessend einem Feld zugeteilt werden (A2) |
| T6 | Vorbereitung bearbeiten, nachdem bereits ein Spieler ein-/ausgewechselt wurde | Bearbeitung wird verhindert, Hinweis auf laufendes Spiel (E4) |
| T7 | Anwesenheit speichern ohne Netzwerkverbindung | Fehlermeldung, Eingabe bleibt erhalten (E3) |
