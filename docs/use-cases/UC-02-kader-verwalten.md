# UC-02: Spieler zum Kader verwalten

**Abgedeckte Anforderungen:** FR-10, FR-11, FR-12, FR-13, FR-14

## Kurzbeschreibung

Der Trainer pflegt den Spielerkader: Spieler hinzufügen, bearbeiten und
entfernen. Der Kader ist unabhängig von einzelnen Turnieren/Spielen
gültig und bleibt dauerhaft gespeichert.

## Primärer Akteur

Trainer

## Vorbedingungen

- Der Trainer ist angemeldet (UC-01).

## Nachbedingungen (Erfolg)

- Der Kader spiegelt die vorgenommene Änderung (neuer Spieler / geänderte
  Daten / deaktivierter Spieler) wider und ist bei jedem künftigen
  Turnier/Spiel entsprechend verfügbar.

## Hauptablauf (Basic Flow) – Spieler hinzufügen

1. Der Trainer öffnet die Kaderverwaltung.
2. Die App zeigt die Liste der aktiven Kaderspieler.
3. Der Trainer wählt "Spieler hinzufügen".
4. Der Trainer gibt den Vornamen ein (Pflichtfeld) und optional die
   Nachname-Initiale.
5. Der Trainer bestätigt.
6. Die App speichert den neuen Spieler (Attribut `aktiv = true`) und zeigt
   ihn in der Kaderliste.

## Alternativabläufe

**A1 – Spieler bearbeiten (FR-11)**
1. Der Trainer wählt einen bestehenden Spieler aus der Kaderliste.
2. Der Trainer ändert Vorname und/oder Nachname-Initiale.
3. Der Trainer bestätigt.
4. Die App speichert die Änderung. Bereits erfasste Anwesenheiten/Einsätze
   dieses Spielers bleiben unverändert mit ihm verknüpft (keine
   rückwirkende Umbenennung historischer Einträge nötig, da nur der
   Spieler-Datensatz selbst verändert wird, nicht dessen ID).

**A2 – Spieler entfernen (FR-12)**
1. Der Trainer wählt einen bestehenden Spieler aus der Kaderliste.
2. Der Trainer wählt "Entfernen".
3. Die App fragt zur Bestätigung nach (Sicherheitsabfrage, da der Vorgang
   den Spieler aus allen künftigen Anwesenheits-/Zuteilungs-Auswahlen
   entfernt).
4. Der Trainer bestätigt.
5. Die App setzt `aktiv = false`, statt den Datensatz physisch zu löschen.
   *Begründung: Anwesenheits-, Zuteilungs- und Einsatz-Datensätze
   vergangener Spiele referenzieren den Spieler per Fremdschlüssel (siehe
   Entity-Modell) und werden für die Statistik (FR-40/FR-41) weiterhin
   benötigt. Ein physisches Löschen würde entweder diese Referenzen
   brechen oder historische Statistiken verfälschen.*
6. Der deaktivierte Spieler erscheint nicht mehr in der Standard-Kaderliste
   und ist bei neuen Spielen nicht mehr für die Anwesenheitserfassung
   wählbar, bleibt aber in vergangenen Statistiken sichtbar.

**A3 – Spieler reaktivieren (FR-14)**
1. Der Trainer wechselt in der Kaderverwaltung zur Ansicht "Inaktive
   Spieler".
2. Der Trainer wählt einen deaktivierten Spieler und wählt "Reaktivieren".
3. Die App setzt `aktiv = true`.
4. Der Spieler erscheint wieder in der Standard-Kaderliste und ist für
   neue Spiele wählbar. Historische Anwesenheits-/Einsatz-Daten aus der
   Zeit vor der Deaktivierung bleiben unverändert erhalten und
   zugeordnet.

## Ausnahmeabläufe

**E1 – Pflichtfeld Vorname leer**
Bei Schritt 5 (Basic Flow) bzw. beim Bearbeiten: Vorname ist leer.
1. Die App verhindert das Speichern und markiert das Feld.

**E2 – Doppelter Vorname ohne unterscheidende Initiale**
Bei Schritt 5 (Basic Flow): Ein aktiver Spieler mit identischem Vornamen
und ohne (oder mit identischer) Nachname-Initiale existiert bereits.
1. Die App zeigt eine Warnung ("Es gibt bereits einen Spieler mit diesem
   Namen – Initiale ergänzen?"), blockiert das Speichern aber nicht
   zwingend (Trainer kann bewusst bestätigen).

**E3 – Netzwerkfehler**
Bei jedem Speichervorgang: Supabase nicht erreichbar.
1. Die App zeigt eine Fehlermeldung, die Eingabe bleibt erhalten, der
   Trainer kann erneut speichern.

## Testfälle

| # | Szenario | Erwartetes Ergebnis |
|---|---|---|
| T1 | Spieler mit Vorname "Lars" hinzufügen | Spieler erscheint in der Kaderliste (Basic Flow) |
| T2 | Spieler ohne Vorname speichern | Speichern wird verhindert, Feld markiert (E1) |
| T3 | Zweiten Spieler "Lars" ohne Initiale hinzufügen, obwohl "Lars" bereits existiert | Warnung erscheint, Speichern bleibt trotzdem möglich (E2) |
| T4 | Vorname eines bestehenden Spielers ändern | Änderung wird übernommen, historische Einsätze bleiben verknüpft (A1) |
| T5 | Spieler entfernen, danach Bestätigung erteilen | Spieler verschwindet aus der Kaderliste, `aktiv = false` gesetzt (A2) |
| T6 | Entfernen-Dialog abbrechen | Spieler bleibt unverändert aktiv in der Kaderliste |
| T7 | Statistik eines vergangenen Turniers nach Deaktivierung eines beteiligten Spielers aufrufen | Der deaktivierte Spieler erscheint weiterhin mit seinen historischen Werten (A2, Bezug FR-40/41) |
| T8 | Spieler hinzufügen ohne Netzwerkverbindung | Fehlermeldung, Eingabe bleibt im Formular erhalten (E3) |
| T9 | Deaktivierten Spieler über "Inaktive Spieler" reaktivieren | Spieler erscheint wieder in der Standard-Kaderliste und ist für neue Spiele wählbar (A3) |
