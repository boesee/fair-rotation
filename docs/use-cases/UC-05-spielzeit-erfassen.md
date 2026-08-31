# UC-05: Spielzeit erfassen

**Abgedeckte Anforderungen:** FR-30, FR-31, FR-32, FR-33, FR-34, FR-35, FR-36, FR-37, FR-45

## Kurzbeschreibung

Während eines laufenden Spiels wechselt der Trainer Spieler auf den
Feldern ein und aus. Pro Feld sieht er jederzeit, wer aktuell spielt und
wer am längsten ununterbrochen auf dem Feld steht – die zentrale
Information, um faire Rotation umzusetzen. Ein ausgewechselter Spieler ist
sofort wieder einwechselbar. Wird ein Spieler auf ein Feld eingewechselt,
dem er laut Zuteilung nicht zugeordnet ist, erkennt die App das und lässt
den Trainer den Feldwechsel bestätigen. Für Block-Rotationen (mehrere
Spieler gleichzeitig, z.B. eine feste 3er-Gruppe) gibt es eine
Mehrfachauswahl (FR-37) sowie turnierweit speicherbare Rotationsblöcke als
Kurzwahl dafür (FR-45), damit dieselbe Gruppe nicht in jedem Spiel erneut
manuell zusammengestellt werden muss.

## Primärer Akteur

Trainer

## Vorbedingungen

- Der Trainer ist angemeldet (UC-01).
- Das Spiel wurde vorbereitet (UC-04): Anwesenheit erfasst, Zuteilung
  vorhanden, Status `laufend`.

## Nachbedingungen (Erfolg)

- Der Einsatz-Datensatz eines eingewechselten Spielers ist offen
  (`ausgewechselt_um = NULL`), seine Spielzeit läuft.
- Der Einsatz-Datensatz eines ausgewechselten Spielers ist geschlossen,
  seine Spielzeit ist kumuliert; der Spieler gilt sofort wieder als
  verfügbar (Bank).
- Zu jedem Zeitpunkt hat ein Spieler höchstens einen offenen
  Einsatz-Datensatz über alle Felder dieses Spiels hinweg (nie
  gleichzeitig auf zwei Feldern aktiv).

## Hauptablauf (Basic Flow) – Spieler einwechseln

1. Der Trainer öffnet die Spielübersicht (ein oder zwei Felder, je nach
   Modus).
2. Die App zeigt pro Feld die zugeteilten Spieler, sortiert nach
   aktueller/kumulierter Spielzeit – längste zuerst (FR-32), mit
   erkennbarer Markierung des Spielers mit der längsten laufenden
   Einsatzzeit (FR-33).
3. Der Trainer wählt auf einem Feld einen nicht aktiven (Bank-)Spieler
   und wählt "Einwechseln".
4. Die App prüft, ob der gewählte Spieler laut aktueller Zuteilung diesem
   Feld zugeordnet ist. Ja → weiter bei Schritt 5.
5. Die App legt einen neuen Einsatz-Datensatz an (`eingewechselt_um =
   jetzt`, `ausgewechselt_um = NULL`).
6. Die App zeigt den Spieler als aktiv auf dem Feld, der Timer läuft.

## Alternativabläufe

**A1 – Spieler auswechseln (FR-31)**
1. Der Trainer wählt auf einem Feld einen aktiven Spieler und wählt
   "Auswechseln".
2. Die App setzt `ausgewechselt_um = jetzt` auf dem offenen
   Einsatz-Datensatz; die Spielzeit dieses Einsatzes wird kumuliert.
3. Der Spieler erscheint sofort wieder als verfügbar (Bank) und kann
   erneut eingewechselt werden (Basic Flow).

**A2 – Feldwechsel erkannt (FR-34)**
Bei Schritt 4 des Basic Flow: Der gewählte Spieler ist laut aktueller
Zuteilung nicht diesem, sondern dem anderen Feld zugeordnet (nur bei
3vs3-Spielen relevant, da es dort zwei Felder gibt).
1. Die App zeigt eine kurze Bestätigung: "Spieler ist Feld [X] zugeteilt –
   auf Feld [Y] einwechseln?".
2. Bestätigt der Trainer:
   a. Ist der Spieler aktuell aktiv auf seinem ursprünglichen Feld
      (offener Einsatz-Datensatz dort), beendet die App diesen Einsatz
      automatisch (`ausgewechselt_um = jetzt`), analog A1.
   b. Die App aktualisiert die Zuteilung des Spielers auf das neue Feld.
   c. Weiter bei Schritt 5 des Basic Flow (neuer Einsatz auf dem neuen
      Feld).
3. Bricht der Trainer ab: Kein Einsatz wird angelegt, Zuteilung bleibt
   unverändert.

**A2b – Alle Bank-Spieler gleichzeitig einwechseln (FR-36)**
Typischerweise zu Spielbeginn, alternativ zu wiederholtem Basic Flow:
1. Der Trainer wählt "Alle einwechseln".
2. Die App legt für jeden aktuell nicht aktiven, aber einem Feld
   zugeteilten Spieler mit demselben Zeitstempel einen neuen
   Einsatz-Datensatz an (`eingewechselt_um = jetzt`).
3. Alle betroffenen Spieler erscheinen als aktiv, ihre Timer starten
   gleichzeitig.

**A2c – Mehrfachauswahl-Wechsel (FR-37)**
Für Block-Rotationen (z.B. eine feste 3er-Gruppe geht gemeinsam vom Feld),
bei denen wiederholtes einzelnes Ein-/Auswechseln zu langsam wäre:
1. Der Trainer aktiviert "Mehrere wechseln" – die Einzel-Aktions-Buttons
   pro Spieler werden durch Checkboxen ersetzt.
2. Der Trainer markiert beliebig viele Spieler, unabhängig davon ob aktiv
   oder Bank, auch über beide Felder hinweg (bei 3vs3).
3. Der Trainer bestätigt ("N wechseln").
4. Die App schliesst für alle markierten aktiven Spieler den offenen
   Einsatz und eröffnet für alle markierten Bank-Spieler einen neuen
   Einsatz – mit demselben Zeitstempel, in möglichst wenigen Anfragen.
5. Die App verlässt den Mehrfachauswahl-Modus automatisch.

**A2d – Rotationsblock verwenden (FR-45)**
Ergänzt A2c, wenn dieselbe Spielergruppe über mehrere Spiele hinweg immer
gemeinsam wechselt (z.B. feste Wechselblöcke bei 6vs6 oder Unterblöcke pro
Feld bei 3vs3):
1. Der Trainer markiert im Mehrfachauswahl-Modus (A2c, Schritt 2) die
   gewünschten Spieler und wählt "Als Block speichern" statt sofort zu
   bestätigen.
2. Der Trainer vergibt einen Namen (z.B. "Block A1").
3. Die App speichert die Auswahl turnierweit (nicht nur für dieses Spiel)
   als Rotationsblock.
4. Ab sofort – auch in späteren Spielen dieses Turniers, unabhängig vom
   Modus – zeigt die App diesen Block als Kurzwahl-Chip im
   Mehrfachauswahl-Modus. Ein Tap markiert alle Mitglieder, die diesem
   Spiel zugeteilt sind, gleichzeitig; ein erneuter Tap hebt die Markierung
   wieder auf. Danach wie A2c ab Schritt 3.
5. Der Trainer kann einen nicht mehr benötigten Block jederzeit löschen.

**A3 – Spiel beenden (FR-35)**
1. Der Trainer wählt in der Spielübersicht "Spiel beenden".
2. Die App zeigt zur Sicherheit eine Bestätigung, insbesondere falls noch
   aktive Spieler auf einem der Felder stehen.
3. Der Trainer bestätigt.
4. Die App schliesst alle noch offenen Einsätze dieses Spiels
   (`ausgewechselt_um = jetzt`).
5. Die App setzt den Status des Spiels auf `beendet`.
6. Ab diesem Zeitpunkt sind für dieses Spiel keine weiteren
   Ein-/Auswechslungen mehr möglich; das Spiel fliesst ab sofort in die
   Statistik ein (UC-06).

## Ausnahmeabläufe

**E1 – Spieler bereits aktiv auf demselben Feld**
Bei Schritt 3 des Basic Flow: Der gewählte Spieler hat bereits einen
offenen Einsatz-Datensatz auf diesem Feld.
1. Die App verhindert ein doppeltes Einwechseln (Aktion "Einwechseln" ist
   für bereits aktive Spieler gar nicht wählbar, nur "Auswechseln").

**E2 – Netzwerkfehler**
Bei Schritt 5 (Basic Flow) bzw. Schritt 2 (A1): Supabase nicht
erreichbar.
1. Die App zeigt eine Fehlermeldung; der Ein-/Auswechsel-Versuch kann
   wiederholt werden. Der lokale UI-Zustand wird nicht optimistisch
   verändert, solange die Bestätigung durch Supabase aussteht, um keine
   inkonsistente Zeitanzeige zu riskieren.

**E3 – Ein-/Auswechseln bei bereits beendetem Spiel**
Bei Schritt 3 des Basic Flow bzw. Schritt 1 von A1: Das Spiel hat bereits
den Status `beendet`.
1. Die App verhindert die Aktion; "Einwechseln"/"Auswechseln" sind für
   ein beendetes Spiel nicht mehr wählbar.

## Testfälle

| # | Szenario | Erwartetes Ergebnis |
|---|---|---|
| T1 | Bank-Spieler auf seinem zugeteilten Feld einwechseln | Einsatz wird angelegt, Timer startet, Spieler als aktiv markiert (Basic Flow) |
| T2 | Aktiven Spieler auswechseln | Einsatz wird geschlossen, Spielzeit kumuliert, Spieler wieder als Bank verfügbar (A1) |
| T3 | Denselben Spieler direkt danach erneut einwechseln | Neuer Einsatz-Datensatz wird angelegt (mehrfache Rotation innerhalb des Spiels möglich) |
| T4 | Übersicht nach mehreren Wechseln aufrufen | Spieler sind nach aktueller/kumulierter Spielzeit sortiert, längste Zeit klar erkennbar (FR-32/33) |
| T5 | Spieler, der Feld A zugeteilt ist, auf Feld B einwechseln, während er aktuell auf Feld A aktiv ist | Bestätigungsdialog erscheint; nach Bestätigung wird Einsatz auf Feld A beendet und neuer Einsatz auf Feld B gestartet, Zuteilung aktualisiert (A2) |
| T6 | Gleiches Szenario wie T5, aber Trainer bricht den Bestätigungsdialog ab | Kein neuer Einsatz, Spieler bleibt aktiv auf Feld A, Zuteilung unverändert (A2, Schritt 3) |
| T7 | Spieler, der Feld B zugeteilt ist und aktuell auf der Bank ist, versehentlich auf Feld A einwechseln | Bestätigungsdialog erscheint; nach Bestätigung startet Einsatz direkt auf Feld A, kein vorheriger Einsatz zu beenden (A2, Schritt 2a entfällt) |
| T8 | Versuch, einen bereits aktiven Spieler erneut einzuwechseln | "Einwechseln" ist für diesen Spieler nicht wählbar (E1) |
| T9 | Ein-/Auswechseln ohne Netzwerkverbindung | Fehlermeldung, UI-Zustand bleibt konsistent mit dem zuletzt bestätigten Stand (E2) |
| T10 | Spiel mit 2 aktiven Spielern beenden | Beide offenen Einsätze werden geschlossen, Status wechselt zu `beendet` (A3) |
| T11 | Nach Beenden eines Spiels versuchen, einen Spieler einzuwechseln | Aktion nicht mehr möglich (E3) |
| T12 | Zu Spielbeginn "Alle einwechseln" bei 6 zugeteilten Bank-Spielern wählen | 6 neue Einsatz-Datensätze mit gleichem Zeitstempel, alle Timer starten gleichzeitig (A2b) |
| T13 | 3 aktive und 3 Bank-Spieler markieren, dann "6 wechseln" bestätigen | 3 offene Einsätze werden geschlossen, 3 neue eröffnet, alle mit demselben Zeitstempel (A2c) |
| T14 | Im Mehrfachauswahl-Modus 3 Spieler markieren und "Als Block speichern" wählen, danach ein weiteres Spiel desselben Turniers öffnen | Der gespeicherte Block erscheint dort als Chip; ein Tap markiert dieselben 3 Spieler (sofern diesem Spiel zugeteilt) automatisch (A2d) |
| T15 | Einen gespeicherten Rotationsblock löschen | Der Chip verschwindet aus allen Spielen dieses Turniers, bestehende Einsätze bleiben unverändert (A2d, Schritt 5) |
