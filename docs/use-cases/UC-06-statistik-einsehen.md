# UC-06: Statistik einsehen

**Abgedeckte Anforderungen:** FR-40, FR-41, FR-42, FR-29

## Kurzbeschreibung

Der Trainer sieht die kumulierte Spielzeit je Spieler – sowohl für ein
einzelnes Turnier als auch turnierübergreifend über die gesamte erfasste
Historie. Bei der turnierübergreifenden Ansicht zusätzlich, an wie vielen
Turnieren der Spieler anwesend war (FR-42). Eine Kennzahl auf Spiel-Ebene
(Anzahl Spiele mit tatsächlicher Einsatzzeit) ist bewusst nicht Teil
dieser Ansicht, seit Anwesenheit turnierweit statt pro Spiel erfasst wird
(UC-04a) – sie wäre für den Trainer keine zusätzliche Information mehr.
Die Statistik berücksichtigt für die Spielzeit ausschliesslich
**abgeschlossene Spiele** (Status `beendet`, FR-35), damit die Werte
stabil sind und sich nicht während der Betrachtung verändern. Die
Entscheidungsgrundlage *während* eines laufenden Spiels liefert die
Live-Übersicht in UC-05 (FR-32/33), nicht dieser Use Case. Rein lesender
Use Case, keine Datenänderung.

## Primärer Akteur

Trainer

## Vorbedingungen

- Der Trainer ist angemeldet (UC-01).
- Mindestens ein Spiel mit Status `beendet` (UC-05, A3) existiert (sonst
  ist die Statistik leer).

## Nachbedingungen (Erfolg)

- Die Statistik-Ansicht zeigt aggregierte Werte ausschliesslich auf Basis
  abgeschlossener Spiele.
- Keine Daten werden durch diesen Use Case verändert.

## Hauptablauf (Basic Flow) – Statistik für ein einzelnes Turnier

1. Der Trainer öffnet ein bestehendes Turnier und wählt "Statistik".
2. Die App berechnet für jeden Spieler mit mindestens einem
   Anwesenheit-Datensatz in diesem Turnier die kumulierte Spielzeit über
   alle **beendeten** Spiele dieses Turniers (Summe aller
   Einsatz-Zeitspannen, FR-40). Spiele mit Status `geplant` oder
   `laufend` fliessen nicht ein.
3. Die App zeigt die Spieler absteigend nach kumulierter Spielzeit
   sortiert (meiste Spielzeit zuerst).

## Alternativabläufe

**A1 – Turnierübergreifende Statistik (FR-41, FR-42)**
1. Der Trainer öffnet den globalen Statistik-Bereich (unabhängig von
   einem einzelnen Turnier).
2. Die App ermittelt zunächst, welche Turniere hier überhaupt
   berücksichtigt werden: nicht als Test markiert (FR-28) **und**
   vollständig `beendet` (FR-29, Turnier-Status aus allen seinen Spielen
   abgeleitet). Ein noch laufendes Turnier fliesst also auch dann nicht
   ein, wenn einzelne seiner Spiele schon beendet sind.
3. Die App berechnet für jeden Spieler (inkl. inaktiv gesetzter Spieler
   mit Historie, vgl. UC-02) die kumulierte Spielzeit über alle beendeten
   Spiele dieser berücksichtigten Turniere hinweg.
4. Die App berechnet zusätzlich je Spieler die Anzahl dieser
   berücksichtigten Turniere mit erfasster Anwesenheit (FR-42).
5. Die App zeigt die Spieler absteigend nach kumulierter Gesamt-Spielzeit
   sortiert, mit der Anzahl-Turniere-Spalte zusätzlich.

## Ausnahmeabläufe

**E1 – Keine Daten vorhanden**
Bei Schritt 2 (Basic Flow) oder Schritt 2 (A1): Für das gewählte Turnier
bzw. insgesamt existieren keine Anwesenheit-/Einsatz-Datensätze.
1. Die App zeigt einen Hinweis ("Noch keine Daten vorhanden") statt einer
   leeren Tabelle.

**E2 – Netzwerkfehler**
Beim Laden der Statistik: Supabase nicht erreichbar.
1. Die App zeigt eine Fehlermeldung mit der Möglichkeit, den Abruf zu
   wiederholen.

## Testfälle

| # | Szenario | Erwartetes Ergebnis |
|---|---|---|
| T1 | Statistik eines Turniers mit 3 beendeten Spielen und unterschiedlichen Einsatzzeiten aufrufen | Spieler werden absteigend nach kumulierter Spielzeit dieses Turniers angezeigt, Werte stimmen mit der Summe der Einsätze überein (Basic Flow) |
| T2 | Turnierübergreifende Statistik nach zwei vollständig beendeten, echten Turnieren aufrufen, bei denen der Spieler beide Male anwesend war | Kumulierte Spielzeit über beide Turniere hinweg korrekt summiert; Anzahl Turniere = 2 (A1) |
| T3 | Turnierübergreifende Statistik aufrufen, während eines der Turniere noch `laufend` ist (einzelne Spiele davon bereits `beendet`) | Dieses Turnier fliesst komplett nicht ein, auch nicht mit seinen bereits beendeten Spielen (A1, Schritt 2) |
| T4 | Statistik aufrufen, während ein Spiel im Status `laufend` ist (noch nicht beendet) | Dieses Spiel fliesst nicht in die Spielzeit-Berechnung ein; Werte bleiben stabil, auch wenn gerade Ein-/Auswechslungen stattfinden (Basic Flow, Schritt 2) |
| T5 | Statistik eines neu angelegten Turniers ohne erfasste Spiele aufrufen | Hinweis "Noch keine Daten vorhanden" statt leerer Tabelle (E1) |
| T6 | Statistik-Ansicht ohne Netzwerkverbindung öffnen | Fehlermeldung mit Wiederholungsmöglichkeit (E2) |
| T7 | Statistik nach Deaktivierung eines Spielers (UC-02, A2) turnierübergreifend aufrufen | Der deaktivierte Spieler erscheint weiterhin mit seinen historischen Werten (Bezug FR-40/41, konsistent mit UC-02/T7) |
| T8 | Turnierübergreifende Statistik nach Abschluss eines Test-Turniers (FR-28) aufrufen | Das Test-Turnier fliesst nicht ein, auch wenn es vollständig `beendet` ist (A1, Schritt 2) |
