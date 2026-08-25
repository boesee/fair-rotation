# UC-03: Turnier anlegen

**Abgedeckte Anforderungen:** FR-20, FR-21, FR-25, FR-26

## Kurzbeschreibung

Der Trainer legt ein neues Turnier an (Datum, Bezeichnung). Die 6 Spiele
werden bewusst **nicht** zwingend im Voraus alle festgelegt, da die genaue
Reihenfolge und teils auch die Modus-Zusammenstellung oft erst am
Turniertag vor Ort ausgelost wird. Stattdessen fügt der Trainer Spiele
einzeln hinzu – vor dem Turnier, falls die Auslosung schon bekannt ist,
oder laufend während des Tages, kurz bevor sie gespielt werden. Die
Feldstruktur (1 oder 2 Felder) je Spiel ergibt sich automatisch aus dem
gewählten Modus.

## Primärer Akteur

Trainer

## Vorbedingungen

- Der Trainer ist angemeldet (UC-01).

## Nachbedingungen (Erfolg)

- Ein Turnier mit Datum/Bezeichnung existiert.
- 0 bis 6 Spiele sind dem Turnier zugeordnet, jeweils mit Modus und
  Reihenfolge-Position; für jedes Spiel sind die passenden
  Feld-Datensätze automatisch angelegt.

## Hauptablauf (Basic Flow) – Turnier anlegen

1. Der Trainer öffnet "Neues Turnier anlegen".
2. Der Trainer erfasst Datum und Bezeichnung.
3. Der Trainer bestätigt.
4. Die App speichert das Turnier (zunächst ohne Spiele).
5. Die App zeigt die Turnierübersicht ("0 von 6 Spielen erfasst").

## Alternativabläufe

**A1 – Spiel hinzufügen (FR-21)**
Kann direkt im Anschluss an Schritt 5 erfolgen, oder zu einem beliebigen
späteren Zeitpunkt am Turniertag – auch mehrfach nacheinander, bis 6
Spiele erreicht sind.
1. Der Trainer öffnet die Turnierübersicht und wählt "Spiel hinzufügen".
2. Der Trainer wählt den Modus (3vs3 oder 6vs6) für dieses Spiel.
3. Der Trainer bestätigt.
4. Die App legt das Spiel an der nächsten freien Reihenfolge-Position an
   und erzeugt automatisch die passenden Feld-Datensätze (2 bei 3vs3, 1
   bei 6vs6 – FR-23, kein separater Trainer-Schritt).
5. Die App zeigt das neue Spiel in der Turnierübersicht.

**A2 – Reihenfolge nachträglich anpassen (FR-26)**
1. Der Trainer wählt in der Turnierübersicht "Reihenfolge bearbeiten".
2. Die App zeigt nur die noch nicht gestarteten Spiele (Status
   `geplant`) als anpassbar; bereits gestartete/beendete Spiele werden
   unveränderbar angezeigt.
3. Der Trainer ordnet die geplanten Spiele neu.
4. Die App speichert die neue Reihenfolge.

**A3 – Abweichende Zusammenstellung wird bewusst akzeptiert (FR-25)**
Sobald 6 Spiele erfasst sind (nach A1) und die Zusammenstellung nicht 3×
3vs3 + 3× 6vs6 ergibt:
1. Die App zeigt eine Warnung mit der abweichenden Zusammenstellung.
2. Der Trainer kann die Warnung zur Kenntnis nehmen (kein Blocker) oder
   ein bereits erfasstes, noch nicht gestartetes Spiel löschen/ändern
   (siehe A1), um die Zusammenstellung zu korrigieren.

**A4 – Nicht gestartetes Spiel löschen**
Der Trainer hat ein Spiel versehentlich mit falschem Modus angelegt (noch
nicht gestartet, Status `geplant`).
1. Der Trainer wählt in der Turnierübersicht das betreffende Spiel und
   wählt "Löschen".
2. Die App prüft, ob das Spiel den Status `geplant` hat (noch keine
   Anwesenheit/Zuteilung/Einsatz erfasst).
3. Die App fragt zur Bestätigung nach.
4. Der Trainer bestätigt.
5. Die App löscht das Spiel inklusive der automatisch erzeugten
   Feld-Datensätze physisch (kein Soft-Delete nötig, da noch keine
   fachlichen Daten – Anwesenheit, Zuteilung, Einsatz – daran hängen).
6. Die Reihenfolge-Positionen der übrigen Spiele bleiben wie gehabt
   erhalten (keine automatische Neunummerierung); der Trainer kann bei
   Bedarf über A2 neu ordnen.
7. Der Trainer kann anschliessend über A1 ein neues Spiel mit korrektem
   Modus hinzufügen.

## Ausnahmeabläufe

**E1 – Bereits 6 Spiele vorhanden**
Bei Schritt 1 von A1: Das Turnier hat bereits 6 Spiele.
1. Die App verhindert das Hinzufügen eines weiteren Spiels und weist
   darauf hin, dass die maximale Anzahl erreicht ist.

**E2 – Pflichtfelder unvollständig**
Bei Schritt 3 (Basic Flow) oder Schritt 3 (A1): Datum bzw. Modus fehlt.
1. Die App verhindert das Speichern und markiert die fehlende Angabe.

**E3 – Netzwerkfehler**
Bei jedem Speichervorgang: Supabase nicht erreichbar.
1. Die App zeigt eine Fehlermeldung, die bisherige Eingabe bleibt
   erhalten, der Trainer kann erneut speichern.

**E4 – Löschversuch eines bereits gestarteten/beendeten Spiels**
Bei Schritt 2 von A4: Das gewählte Spiel hat den Status `laufend` oder
`beendet`.
1. Die App verhindert das Löschen und weist darauf hin, dass bereits
   erfasste Spieldaten (Anwesenheit, Einsätze) nicht rückwirkend entfernt
   werden können.

## Testfälle

| # | Szenario | Erwartetes Ergebnis |
|---|---|---|
| T1 | Turnier mit Datum und Bezeichnung anlegen, noch kein Spiel hinzufügen | Turnier existiert mit "0 von 6 Spielen" (Basic Flow) |
| T2 | Direkt nach Turnier-Erstellung ein Spiel mit Modus 3vs3 hinzufügen | Spiel wird an Position 1 angelegt, 2 Feld-Datensätze automatisch erzeugt (A1) |
| T3 | Am Turniertag, nachdem 2 Spiele bereits gespielt wurden, ein drittes Spiel mit Modus 6vs6 hinzufügen | Spiel wird an Position 3 angelegt, 1 Feld-Datensatz automatisch erzeugt (A1) |
| T4 | Reihenfolge von zwei noch nicht gestarteten Spielen vertauschen | Neue Reihenfolge wird gespeichert (A2) |
| T5 | Versuch, die Reihenfolge eines bereits gestarteten Spiels zu ändern | Spiel wird als nicht anpassbar angezeigt, Änderung nicht möglich (A2) |
| T6 | 6. Spiel hinzufügen, wenn bereits 6 Spiele erfasst sind | Hinzufügen wird verhindert, Hinweis auf erreichtes Maximum (E1) |
| T7 | 6 Spiele mit 4× 3vs3 und 2× 6vs6 erfassen | Warnung erscheint nach dem 6. Spiel, keine Blockade (A3) |
| T8 | Spiel hinzufügen ohne gewählten Modus | Speichern wird verhindert, Feld markiert (E2) |
| T9 | Turnier anlegen ohne Netzwerkverbindung | Fehlermeldung, Eingabe bleibt im Formular erhalten (E3) |
| T10 | Ein Spiel mit Status `geplant` löschen | Spiel und zugehörige Feld-Datensätze werden entfernt, restliche Reihenfolge-Positionen bleiben unverändert (A4) |
| T11 | Löschen eines Spiels versuchen, das bereits Anwesenheit/Einsätze erfasst hat (`laufend`/`beendet`) | Löschen wird verhindert, Hinweis auf bestehende Spieldaten (E4) |
