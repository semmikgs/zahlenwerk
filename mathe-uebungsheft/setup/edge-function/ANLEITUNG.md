# Edge Function einrichten

Einmalig, etwa zehn Minuten. Danach legst du Schülerkonten im Browser an,
ohne je wieder SQL anfassen zu müssen.

## Warum überhaupt

Konten anlegen darf nur, wer den `service_role`-Schlüssel hat. Dieser Schlüssel
hebelt sämtliche Zugriffsregeln aus – wer ihn besitzt, kann alles lesen und
ändern. Er darf deshalb **niemals** in das GitHub-Repository, denn das ist
öffentlich.

Die Lösung: Das Anlegen passiert nicht im Browser, sondern auf dem
Supabase-Server. Dort liegt der Schlüssel sicher. Dein Lehrerbereich schickt
nur die Namensliste hin und bekommt die Codes zurück.

## Schritte

**1. Funktion anlegen**

Im Supabase-Dashboard: *Edge Functions* → neue Funktion anlegen, im Editor.

**2. Code einfügen**

Den gesamten Inhalt von `index.ts` aus diesem Ordner in den Editor kopieren und
den vorhandenen Beispielcode dabei vollständig ersetzen.

**3. Namen vergeben**

Unten rechts steht ein Feld *Function name* mit einem vorgeschlagenen Namen
wie `swift-responder`. Diesen löschen und genau `schueler` eintragen – sonst
findet der Lehrerbereich die Funktion nicht. Dann *Deploy function*.

**4. Prüfen**

Unter *Edge Functions* muss `schueler` jetzt mit einem grünen Haken stehen.
Die Schlüssel musst du nirgends eintragen – Supabase stellt sie der Funktion
von selbst zur Verfügung.

## Was die Funktion kann

| Aktion | Wirkung |
|---|---|
| `anlegen` | Namensliste rein, Konten und Codes raus |
| `code_neu` | Neuer Code bei verlorenem Streifen; Lernstand und Sterne bleiben |
| `entfernen` | Konto mitsamt allen Daten löschen |

Jeder Aufruf prüft zuerst, ob der Anfragende als Lehrkraft eingetragen ist.
Ein Schülercode kommt hier nicht durch.

## Namen

Die Namen werden nur benutzt, um die Codes den richtigen Streifen zuzuordnen.
Gespeichert wird nichts davon – in der Datenbank steht am Ende nur der Code.
Die Zuordnung Name zu Code behältst du auf Papier.

Das heißt auch: Geht dir die Liste verloren, lässt sie sich nicht
wiederherstellen. Die gedruckte Seite also aufheben oder abfotografieren.
