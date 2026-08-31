# UC-07: Nachträglich korrigieren (Admin)

**Abgedeckte Anforderungen:** FR-43

## Kurzbeschreibung

Ein eigener Menüpunkt in der Hauptnavigation (neben Kader/Turniere/
Statistik), in dem der Trainer zunächst ein Turnier auswählt und dann
Erfassungsfehler nachträglich korrigiert: Turnier-Anwesenheit (auch nach
Turnierabschluss, siehe UC-04a/E2) sowie einzelne Einsätze (Ein-/
Auswechselzeitpunkt), inklusive Löschen und Nacherfassen fehlender
Einsätze. Die kumulierte Spielzeit ist eine reine Ableitung aus den
Einsätzen (siehe Entity-Modell, Abschnitt "Einsatz") und hat deshalb kein
eigenes Editierfeld – sie korrigiert sich automatisch mit den Einsätzen.

Bewusst ein ungeschütztes Werkzeug für den Ausnahmefall: keine
Plausibilitätsprüfung (z.B. überlappende Einsätze desselben Spielers über
mehrere Felder), keine Sperre nach Spiel- oder Turnierstatus. Grund: die
Bedienung unter Zeitdruck während eines laufenden Spiels (NFR-1) führt
gemäss Praxiserfahrung gelegentlich zu ungenauen Zeitstempeln oder
vergessenen Wechseln, die im Nachhinein in Ruhe richtiggestellt werden
müssen.

## Primärer Akteur

Trainer

## Vorbedingungen

- Der Trainer ist angemeldet (UC-01).
- Ein Turnier existiert (UC-03).

## Nachbedingungen (Erfolg)

- Die Anwesenheit- bzw. Einsatz-Datensätze entsprechen den vom Trainer
  eingegebenen Korrekturwerten.
- Kumulierte Spielzeit und Statistik (UC-06) spiegeln die Korrektur beim
  nächsten Aufruf automatisch wider.

## Hauptablauf (Basic Flow) – Einsatz-Zeitpunkt korrigieren

1. Der Trainer wählt "Admin" in der Hauptnavigation und darin ein
   Turnier aus.
2. Der Trainer wählt ein Spiel aus der Liste.
3. Die App zeigt pro Feld dieses Spiels alle Einsätze mit Spielername,
   Ein- und Auswechselzeitpunkt.
4. Der Trainer passt bei einem Einsatz den Ein- und/oder Auswechsel­
   zeitpunkt an und bestätigt ("Speichern") für diese Zeile.
5. Die App speichert die korrigierten Zeitpunkte für diesen Einsatz.

## Alternativabläufe

**A1 – Anwesenheit korrigieren**
1. Im selben Admin-Bereich passt der Trainer die Turnier-Anwesenheit an
   (identische Eingabe wie UC-04a, jedoch ohne Sperre nach
   Turnierabschluss).
2. Der Trainer bestätigt ("Speichern").
3. Die App speichert die Anwesenheit-Datensätze.

**A2 – Einsatz löschen**
Bei Schritt 4 des Basic Flow: der Einsatz ist fälschlicherweise erfasst
(z.B. Doppelerfassung).
1. Der Trainer wählt bei diesem Einsatz "Löschen" und bestätigt die
   Sicherheitsabfrage.
2. Die App entfernt den Einsatz-Datensatz endgültig.

**A3 – Fehlenden Einsatz nacherfassen**
Bei Schritt 3 des Basic Flow: eine Ein-/Auswechslung wurde während des
Spiels gar nicht erfasst (z.B. vergessen).
1. Der Trainer wählt im Formular "Einsatz hinzufügen" Spieler, Feld und
   Einwechselzeitpunkt (Auswechselzeitpunkt optional, z.B. wenn der
   Spieler noch aktiv sein soll).
2. Der Trainer bestätigt.
3. Die App legt einen neuen Einsatz-Datensatz mit den angegebenen Werten
   an.

## Ausnahmeabläufe

**E1 – Netzwerkfehler**
Bei jedem Speichervorgang: Supabase nicht erreichbar.
1. Die App zeigt eine Fehlermeldung; der Korrekturversuch kann wiederholt
   werden.

## Testfälle

| # | Szenario | Erwartetes Ergebnis |
|---|---|---|
| T1 | Einwechselzeitpunkt eines Einsatzes um 30 Sekunden nach vorne korrigieren | Kumulierte Spielzeit dieses Spielers in Statistik (UC-06) verringert sich entsprechend (Basic Flow) |
| T2 | Anwesenheit eines Spielers nach Turnierabschluss über den Admin-Bereich nachtragen | Anwesenheit wird gespeichert, obwohl die reguläre Anwesenheits-Seite (UC-04a) bereits gesperrt ist (A1) |
| T3 | Versehentlich doppelt erfassten Einsatz löschen | Einsatz verschwindet aus der Liste, Spielzeit-Summe reduziert sich entsprechend (A2) |
| T4 | Vergessene Einwechslung nacherfassen, Auswechselzeitpunkt leer lassen | Neuer offener Einsatz wird angelegt, Spieler erscheint in UC-05 wieder als aktiv (A3) |
| T5 | Korrektur ohne Netzwerkverbindung speichern | Fehlermeldung, Korrekturversuch wiederholbar (E1) |
