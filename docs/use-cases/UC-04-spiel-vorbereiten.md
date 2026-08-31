# UC-04: Spiel vorbereiten

**Abgedeckte Anforderungen:** FR-24, FR-27

## Kurzbeschreibung

Vor Beginn eines Spiels teilt der Trainer die für dieses Turnier bereits
als anwesend erfassten Spieler (siehe UC-04a) auf die Felder des Spiels
auf. Bei einem 3vs3-Spiel geschieht das manuell auf zwei Felder; bei einem
6vs6-Spiel entfällt dieser Schritt, da nur ein Feld existiert – alle
turnier-anwesenden Spieler werden diesem automatisch zugeordnet. Erst nach
Abschluss dieser Zuteilung gilt das Spiel als bereit für die eigentliche
Spielzeit-Erfassung (UC-05).

Die Anwesenheit selbst wird **nicht** mehr hier, sondern einmalig pro
Turnier erfasst (UC-04a) – ein Turniertag hat praktisch immer dieselben
anwesenden Spieler über alle 6 Spiele hinweg, eine Wiederholung pro Spiel
wäre reine Doppelarbeit.

## Primärer Akteur

Trainer

## Vorbedingungen

- Der Trainer ist angemeldet (UC-01).
- Ein Spiel mit Status `geplant` existiert innerhalb eines Turniers
  (UC-03), inklusive der zum Modus passenden Feld-Datensätze.
- Für das Turnier ist mindestens ein Spieler als anwesend erfasst (UC-04a).
  Ist das nicht der Fall, verweist die App auf die Anwesenheits-Erfassung
  des Turniers, statt eine leere Zuteilung anzuzeigen.

## Nachbedingungen (Erfolg)

- Jeder turnier-anwesende Spieler ist genau einem Feld dieses Spiels
  zugeteilt (bei 3vs3 manuell, bei 6vs6 automatisch).
- Der Status des Spiels wechselt von `geplant` zu `laufend`.
- Solange noch kein Einsatz-Datensatz für dieses Spiel existiert, bleibt
  eine Korrektur über A2 möglich (Status `laufend` allein blockiert das
  noch nicht).

## Hauptablauf (Basic Flow) – Spiel mit Modus 3vs3

1. Der Trainer wählt aus der Turnierübersicht ein Spiel mit Status
   `geplant`.
2. Die App zeigt die für dieses Turnier als anwesend erfassten Spieler
   (UC-04a) zur Feldzuteilung (Feld A / Feld B).
3. Der Trainer teilt jeden Spieler manuell einem der zwei Felder zu
   (FR-24).
4. Der Trainer bestätigt die Zuteilung.
5. Die App speichert die Zuteilung-Datensätze und setzt den Status des
   Spiels auf `laufend`.
6. Die App zeigt die Spielübersicht mit den zwei Feldern und den
   zugeteilten Spielern – Ausgangspunkt für UC-05.

## Alternativabläufe

**A1 – Spiel mit Modus 6vs6 (automatische Zuteilung)**
Bei Schritt 2 des Basic Flow: Der Modus des Spiels ist 6vs6.
1. Die App überspringt die manuelle Feldzuteilung.
2. Die App erstellt automatisch für jeden turnier-anwesenden Spieler einen
   Zuteilung-Datensatz auf das eine vorhandene Feld.
3. Die App setzt den Status des Spiels auf `laufend`.
4. Weiter bei Schritt 6 des Basic Flow.

**A2 – Zuteilung korrigieren (FR-27)**
Solange für dieses Spiel noch kein Einsatz-Datensatz existiert (auch wenn
der Status bereits `laufend` ist), kann der Trainer zur Feldzuteilung
zurückkehren:
1. Der Trainer öffnet das Spiel erneut.
2. Die App zeigt die bisherige Zuteilung vorausgefüllt.
3. Der Trainer passt die Zuteilung an (z.B. Feld wechseln, neu als
   anwesend erfassten Spieler zuteilen).
4. Der Trainer bestätigt.
5. Die App aktualisiert die Zuteilung-Datensätze entsprechend (bei 6vs6
   wird die automatische Zuteilung für neu anwesende Spieler
   entsprechend nachgeführt).

## Ausnahmeabläufe

**E1 – Keine turnier-anwesenden Spieler**
Bei Schritt 2 des Basic Flow: Für das Turnier ist noch keine Anwesenheit
erfasst.
1. Die App zeigt einen Hinweis mit Link zur Anwesenheits-Erfassung des
   Turniers (UC-04a), statt eine leere Zuteilungsliste anzuzeigen.

**E2 – Nicht alle anwesenden Spieler einem Feld zugeteilt (nur 3vs3)**
Bei Schritt 4 des Basic Flow: Mindestens ein turnier-anwesender Spieler
ist noch keinem Feld zugeteilt.
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
1. Die App verhindert die Bearbeitung der Feldzuteilung und weist darauf
   hin, dass das Spiel bereits läuft. (Die Turnier-Anwesenheit selbst
   bleibt davon unberührt änderbar, siehe UC-04a.)

## Testfälle

| # | Szenario | Erwartetes Ergebnis |
|---|---|---|
| T1 | Bei einem 3vs3-Spiel 5 turnier-anwesende Spieler auf Feld A/B verteilen | Zuteilung gespeichert, Status wechselt zu `laufend` (Basic Flow) |
| T2 | Bei einem 6vs6-Spiel mit 8 turnier-anwesenden Spielern öffnen | Alle 8 automatisch dem einen Feld zugeteilt, kein manueller Zuteilungsschritt sichtbar (A1) |
| T3 | Spiel vorbereiten öffnen, bevor für das Turnier Anwesenheit erfasst wurde | Hinweis mit Link zur Anwesenheits-Erfassung statt leerer Liste (E1) |
| T4 | Bei 3vs3 einen anwesenden Spieler keinem Feld zuteilen und bestätigen | Bestätigen wird verhindert, nicht zugeteilter Spieler markiert (E2) |
| T5 | Nach abgeschlossener Zuteilung (Status `laufend`, noch kein Einsatz) einen nachträglich als turnier-anwesend erfassten Spieler zuteilen | Zuteilung wird aktualisiert (A2) |
| T6 | Zuteilung bearbeiten, nachdem bereits ein Spieler ein-/ausgewechselt wurde | Bearbeitung wird verhindert, Hinweis auf laufendes Spiel (E4) |
| T7 | Zuteilung speichern ohne Netzwerkverbindung | Fehlermeldung, Eingabe bleibt erhalten (E3) |

---

# UC-04a: Turnier-Anwesenheit erfassen

**Abgedeckte Anforderungen:** FR-22, FR-27, FR-29, FR-44

## Kurzbeschreibung

Der Trainer markiert, welche Kaderspieler an einem Turniertag **fehlen**
(nicht: wer da ist) – die Standardannahme ist, dass der ganze aktive
Kader teilnimmt, da für 3vs3/6vs6 ohnehin nur eine Teilmenge sinnvoll ist
und Ausfälle oft schon Tage vorher bekannt sind. Für jeden markierten
Spieler wird zusätzlich ein Grund erfasst: "privat verhindert" oder
"Kader war voll" – Letzteres fliesst in die Kader-Fairness-Statistik
(FR-44, UC-06) ein, damit über mehrere Turniere hinweg fair entschieden
werden kann, wer beim nächsten Mal Vorrang hat. Das Ergebnis ist die
Kandidatenliste für die Feldzuteilung in UC-04. Nachträglich änderbar
(z.B. Spieler sagt kurzfristig ab), unabhängig vom Status einzelner Spiele
– bis das Turnier als Ganzes `beendet` ist (FR-29). Danach ist eine
Korrektur nur noch über den Admin-Bereich möglich (UC-07).

## Primärer Akteur

Trainer

## Vorbedingungen

- Der Trainer ist angemeldet (UC-01).
- Ein Turnier existiert (UC-03).

## Nachbedingungen (Erfolg)

- Für jeden aktiven Kaderspieler ist ein Anwesenheit-Datensatz für dieses
  Turnier erfasst (anwesend = true/false; bei false zusätzlich ein Grund).

## Hauptablauf (Basic Flow)

1. Der Trainer öffnet ein Turnier und wählt "Anwesenheit".
2. Die App zeigt die Liste der aktiven Kaderspieler, jeweils mit einer
   Markierung "fehlt" (vorausgefüllt mit dem zuletzt gespeicherten Stand,
   falls vorhanden; standardmässig nicht markiert = anwesend).
3. Der Trainer markiert die fehlenden Spieler und wählt je einen Grund
   ("privat verhindert" – voreingestellt – oder "Kader war voll").
4. Der Trainer bestätigt.
5. Die App speichert für jeden aktiven Kaderspieler einen
   Anwesenheit-Datensatz für dieses Turnier (FR-22): `anwesend = false`
   plus Grund für die markierten Spieler, `anwesend = true` für alle
   anderen.

## Alternativabläufe

**A1 – Nachträglich korrigieren (FR-27)**
1. Der Trainer öffnet die Anwesenheits-Erfassung erneut, jederzeit
   während des Turniertags, unabhängig davon, ob bereits einzelne Spiele
   `laufend`/`beendet` sind – solange das Turnier als Ganzes noch nicht
   `beendet` ist (E2).
2. Die App zeigt den zuletzt gespeicherten Stand vorausgefüllt.
3. Der Trainer passt die Anwesenheit an.
4. Der Trainer bestätigt; die Änderung wirkt sich auf die Feldzuteilung
   noch nicht gestarteter Spiele aus (UC-04), bereits gestartete/beendete
   Spiele bleiben unverändert.

## Ausnahmeabläufe

**E1 – Netzwerkfehler**
Beim Speichern: Supabase nicht erreichbar.
1. Die App zeigt eine Fehlermeldung, bisherige Eingaben bleiben erhalten,
   der Trainer kann erneut speichern.

**E2 – Turnier bereits vollständig beendet**
Bei Schritt 1 des Basic Flow bzw. von A1: Der Turnier-Status ist
`beendet` (FR-29, alle Spiele des Turniers sind `beendet`).
1. Die App zeigt die Anwesenheit nur noch lesend an und verweist auf den
   Admin-Bereich (UC-07) für eine Korrektur.

## Testfälle

| # | Szenario | Erwartetes Ergebnis |
|---|---|---|
| T1 | Anwesenheit für ein neues Turnier speichern, ohne jemanden zu markieren | Alle aktiven Kaderspieler werden als `anwesend = true` gespeichert (Basic Flow, Standardannahme) |
| T2 | Zwei Spieler als fehlend markieren, einen mit Grund "privat verhindert", einen mit "Kader war voll" | Beide werden als `anwesend = false` mit dem jeweils gewählten Grund gespeichert (Basic Flow) |
| T3 | Anwesenheit für ein Turnier nachträglich ändern, während ein Spiel bereits `beendet`, aber nicht alle Spiele beendet sind | Änderung wird gespeichert, betrifft nur künftige Feldzuteilungen (A1) |
| T4 | Anwesenheit speichern ohne Netzwerkverbindung | Fehlermeldung, Eingabe bleibt erhalten (E1) |
| T5 | Anwesenheits-Erfassung öffnen, nachdem das letzte Spiel des Turniers beendet wurde | Nur lesende Ansicht mit Verweis auf Admin-Bereich, keine Speichern-Möglichkeit (E2) |
