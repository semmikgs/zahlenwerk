# Zahlenwerk

Übungsplattform für den Mathematikunterricht an der KGS Schwarmstedt.
Gebaut für das Handy: tägliche Lektion, Erklärungen auf Abruf, automatische
Wiederholung und eine Auswertung, die zeigt, an welchen Teilkompetenzen es hakt.

## Zum Kurs

**https://semmikgs.github.io/zahlenwerk/mathe-uebungsheft/**

<img src="bilder/qr-mathe-uebungsheft.png" alt="QR-Code zum Mathe-Übungsheft" width="220">

Zum Aushängen oder Projizieren: `qr-druck.html` im Browser öffnen und drucken.
Die Druckfassung des QR-Codes liegt zusätzlich als SVG unter
`bilder/qr-mathe-uebungsheft.svg` und bleibt in jeder Größe scharf.

Ein Konto ist zum Ausprobieren nicht nötig: auf der Anmeldeseite führt
**Ohne Anmeldung üben** direkt in den Kurs. Der Fortschritt bleibt dann auf dem
Gerät und erscheint nicht in der Lehreransicht.

## Was drin ist

| Ordner | Inhalt |
|---|---|
| `mathe-uebungsheft/` | die Plattform selbst |
| `mathe-uebungsheft/kapitel/` | die Kapitel als einzelne Dateien |
| `mathe-uebungsheft/setup/` | SQL für die Nutzerverwaltung |
| `bilder/` | QR-Codes zum Teilen |

Bisherige Kapitel: Rationale Zahlen, Prozentrechnung, Terme zusammenfassen,
Gleichungen lösen.

## Wie es funktioniert

Die **Tagesaufgabe** zieht acht Aufgaben aus allen Kapiteln zusammen und nimmt
zuerst alles, was zur Wiederholung ansteht. Sie hält die Serie am Laufen.

**Gezielt üben** heißt: acht Aufgaben aus einem einzelnen Kapitel, beliebig oft.
Zum Nachholen vor einer Arbeit.

Aufgaben entstehen aus Vorlagen mit Zufallszahlen, nicht aus einer festen Liste.
Jede Wiederholung bringt neue Zahlen und neu gemischte Antworten. Jede falsche
Antwortmöglichkeit trägt den Denkfehler, der zu ihr führt – daraus entsteht die
Auswertung in `lehrer.html`.

Jede Aufgabenvorlage wandert pro Schüler durch sieben Stufen: richtig beantwortet
rückt sie vor und kommt nach 1, 2, 4, 8, 16 bzw. 30 Tagen wieder, falsch
beantwortet schon in der nächsten Lektion.

## Ein Kapitel ergänzen

1. Datei nach dem Muster von `kapitel/terme.js` in den Kapitelordner legen.
2. In `kapitel/index.json` eine Zeile ergänzen.

Alles Weitere steht in `mathe-uebungsheft/README.md`.

## Konten und Auswertung

Ohne weitere Einrichtung läuft alles im Übungsmodus: Fortschritt bleibt auf dem
jeweiligen Gerät. Für Schülerkonten und die Lehreransicht ist ein kostenloses
Supabase-Projekt nötig; die Schritte stehen in `mathe-uebungsheft/README.md`,
die Tabellen in `mathe-uebungsheft/setup/supabase.sql`.

Gespeichert werden nur Kürzel und Übungsergebnisse, keine Namen.
