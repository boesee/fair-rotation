# UC-01: Anmelden

**Abgedeckte Anforderungen:** FR-1, FR-2, NFR-4

## Kurzbeschreibung

Der Trainer meldet sich mit seinem Benutzerkonto an, damit die App auf die
in Supabase gespeicherten Daten (Kader, Turniere, Spiele, Statistiken)
zugreifen kann. Ohne gültige Anmeldung sind keine Daten lesbar oder
schreibbar (Durchsetzung über Row Level Security, NFR-4 – die Anmeldung in
der UI ist die Voraussetzung dafür, dass die API-Requests überhaupt
autorisiert sind, nicht nur eine UI-Hürde).

## Primärer Akteur

Trainer

## Vorbedingungen

- Ein Benutzerkonto (E-Mail/Passwort) existiert bereits in Supabase Auth.
  Die Erstellung dieses Kontos ist kein Teil dieses Use Case, da es sich um
  ein einmaliges Setup durch den Trainer selbst handelt (kein
  Self-Service-Registrierungs-Flow in der App, vgl. Vision: ein Trainer,
  ein Konto).
- Der Trainer ruft die App-URL im Browser (iOS Safari) auf.

## Nachbedingungen (Erfolg)

- Eine gültige Session ist im Browser gespeichert.
- Alle nachfolgenden API-Requests an Supabase sind als authentifizierter
  Benutzer autorisiert.
- Der Trainer sieht die Hauptübersicht der App.

## Nachbedingungen (Misserfolg)

- Keine Session vorhanden.
- Der Trainer bleibt auf dem Login-Formular, mit einer verständlichen
  Fehlermeldung.

## Hauptablauf (Basic Flow)

1. Der Trainer öffnet die App.
2. Die App prüft, ob bereits eine gültige, nicht abgelaufene Session
   vorhanden ist.
3. Keine gültige Session vorhanden → die App zeigt das Login-Formular
   (Felder: E-Mail, Passwort).
4. Der Trainer gibt E-Mail und Passwort ein und bestätigt.
5. Die App sendet die Anmeldedaten an Supabase Auth.
6. Supabase Auth validiert die Anmeldedaten und liefert ein gültiges
   Session-Token zurück.
7. Die App speichert die Session und zeigt die Hauptübersicht.

## Alternativabläufe

**A1 – Gültige Session bereits vorhanden**
Bei Schritt 2: Ist bereits eine gültige Session vorhanden (z.B. App war
kürzlich schon geöffnet), überspringt die App das Login-Formular und zeigt
direkt die Hauptübersicht. Weiter bei Nachbedingung (Erfolg).

**A2 – Abmelden (FR-2)**
Der Trainer ist angemeldet und wählt in der App "Abmelden".
1. Die App invalidiert die lokale Session.
2. Die App zeigt das Login-Formular.
Nachbedingung: keine gültige Session mehr vorhanden, kein Datenzugriff
möglich.

## Ausnahmeabläufe

**E1 – Falsche Anmeldedaten**
Bei Schritt 6: Supabase Auth lehnt die Anmeldedaten ab (falsches Passwort
oder unbekannte E-Mail).
1. Die App zeigt eine allgemeine Fehlermeldung ("E-Mail oder Passwort
   falsch") – ohne zu verraten, ob die E-Mail existiert.
2. Der Trainer bleibt auf dem Login-Formular und kann es erneut versuchen.

**E2 – Netzwerkfehler**
Bei Schritt 5: Kein Netzwerkzugriff möglich oder Supabase nicht
erreichbar.
1. Die App zeigt eine Fehlermeldung ("Keine Verbindung – bitte erneut
   versuchen").
2. Der Trainer kann den Vorgang wiederholen, sobald wieder Netz verfügbar
   ist.

**E3 – Leere Pflichtfelder**
Bei Schritt 4: E-Mail oder Passwort sind leer.
1. Die App verhindert das Absenden und markiert die fehlenden Felder.

## Testfälle

| # | Szenario | Erwartetes Ergebnis |
|---|---|---|
| T1 | Korrekte E-Mail + korrektes Passwort eingeben | Anmeldung erfolgreich, Hauptübersicht wird angezeigt (Basic Flow) |
| T2 | Falsches Passwort eingeben | Fehlermeldung, Login-Formular bleibt sichtbar (E1) |
| T3 | Unbekannte E-Mail eingeben | Gleiche generische Fehlermeldung wie T2 (E1) – kein Hinweis, ob die E-Mail existiert |
| T4 | App erneut öffnen innerhalb gültiger Session-Dauer | Kein Login-Formular, direkt Hauptübersicht (A1) |
| T5 | "Abmelden" auslösen, danach App neu laden | Login-Formular erscheint wieder, kein Datenzugriff mehr möglich (A2) |
| T6 | Anmeldeversuch ohne Netzwerkverbindung | Fehlermeldung zu Verbindungsproblem, kein Absturz (E2) |
| T7 | Formular mit leerem Passwort-Feld absenden | Absenden wird verhindert, Feld wird markiert (E3) |
| T8 | Ohne gültige Session direkt einen API-Request gegen Supabase absetzen (z.B. via Devtools) | Request wird durch RLS abgelehnt, unabhängig vom UI-Zustand (NFR-4) |
