# UC-05: Spielzeit erfassen

**Abgedeckte Anforderungen:** FR-30, FR-31, FR-32, FR-33, FR-34, FR-35

## Kurzbeschreibung

Während eines laufenden Spiels wechselt der Trainer Spieler auf den
Feldern ein und aus. Pro Feld sieht er jederzeit, wer aktuell spielt und
wer am längsten ununterbrochen auf dem Feld steht – die zentrale
Information, um faire Rotation umzusetzen. Ein ausgewechselter Spieler ist
sofort wieder einwechselbar. Wird ein Spieler auf ein Feld eingewechselt,
dem er laut Zuteilung nicht zugeordnet ist, erkennt die App das und lässt
den Trainer den Feldwechsel bestätigen.

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
