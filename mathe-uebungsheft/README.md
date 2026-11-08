# Zahlenwerk – Mathe-Übungsheft

Übungsplattform für den Handybrowser: tägliche Lektion mit Stern, Erklärungen
auf Abruf, automatische Wiederholung und eine Auswertung, die zeigt, an welchen
Teilkompetenzen es hakt.

## Ohne Einrichtung ausprobieren

Seite öffnen, **Ohne Code üben** antippen. Der gesamte Kurs steht offen, der
Fortschritt bleibt auf dem Gerät. Zum Testen der Aufgaben reicht das.

Die Seite muss über eine Webadresse laufen. Ein Doppelklick auf `index.html`
funktioniert nicht, weil Browser lokale Dateien nicht als Module laden.

## Einrichtung mit Konten und Auswertung

**1. Datenbank anlegen**

`setup/supabase.sql` im SQL-Editor von Supabase einmal komplett ausführen.
Wer eine ältere Fassung eingespielt hat, führt zusätzlich
`setup/rechte-nachtragen.sql` aus – sonst meldet die Edge Function später
„permission denied for table profil".
Das legt das Schema `zahlenwerk` an – getrennt von den anderen Schultools in
derselben Instanz.

**2. Schema freigeben**

*Project Settings → API → Exposed schemas* um `zahlenwerk` ergänzen.
Ohne diesen Schritt antwortet die Datenbank nicht.

**3. Schlüssel eintragen**

*Project Settings → API* öffnen und den `anon public`-Schlüssel in
`js/config.js` eintragen. Die Projekt-URL steht dort schon.

Der anon-Schlüssel darf öffentlich im Repository stehen – dafür ist er gedacht.
Den Zugriff regeln die Richtlinien in der Datenbank, nicht der Schlüssel.
Der `service_role`-Schlüssel gehört dort **niemals** hinein.

**4. Edge Function einrichten**

Siehe `setup/edge-function/ANLEITUNG.md`. Einmalig, etwa zehn Minuten.
Sie legt später die Schülerkonten an.

**5. Eigenes Lehrerkonto**

Unter *Authentication → Users* mit der dienstlichen E-Mail anlegen, dann den
auskommentierten Block am Ende von `setup/supabase.sql` anpassen und ausführen.
Danach ist `lehrer.html` erreichbar.

Zwei Dinge zum Vormerken: Kostenlose Supabase-Projekte pausieren, wenn eine
Woche lang niemand zugreift – nach den Ferien einmal im Dashboard aufwecken.
Und in der Datenbank stehen nur Codes und Übungsergebnisse, keine Namen.

## Zugänge für die Klasse

Im Lehrerbereich unter *Zugänge*: Namensliste einfügen, Klasse eintragen,
**Zugänge erzeugen**. Für jeden Namen entsteht ein Konto mit achtstelligem Code.
Die Codes erscheinen als Streifen zum Ausschneiden; über *Drucken* lässt sich
daraus eine PDF-Seite erzeugen.

Die Codes benutzen keine verwechselbaren Zeichen – kein O neben 0, kein I neben
1 – damit das Abtippen auf dem Handy klappt.

Auf jedem Streifen steht ein QR-Code. Ohne Haken bei *QR-Code meldet direkt an*
führt er nur auf die Anmeldeseite, der Code wird getippt. Mit Haken enthält er
den Zugangscode und meldet beim Scannen sofort an – bequemer, aber wer den
Streifen findet, kommt damit auch ins Konto. Für eine neunte Klasse ist das
meist vertretbar; die Entscheidung liegt bei dir.

Der QR-Code wird im Browser erzeugt, aus einer Bibliothek, die im Repository
liegt (`js/fremd/`). Es geht keine Anfrage nach außen, und im Schulnetz
blockiert nichts.

**Die Namen werden nicht gespeichert.** Sie dienen nur dazu, die Codes den
richtigen Streifen zuzuordnen. In der Datenbank steht nur der Code.

Darum gibt es direkt nach dem Erzeugen den Knopf **Zuordnung als Datei sichern**.
Diese Datei ist die einzige Verbindung zwischen Namen und Codes – heb sie auf.
Mit ihr lassen sich die Streifen jederzeit neu drucken: Inhalt unter
*Streifen erneut drucken* einfügen, fertig. Ohne sie bleibt nur, die Zugänge zu
löschen und neu anzulegen.

Verliert ein Schüler seinen Streifen: im Lehrerbereich unter *Schüler* die Zeile
anklicken und **Neuen Code vergeben**. Lernstand und Sterne bleiben erhalten.

Am Schuljahresende oder für einen frischen Start: unter *Schüler* die Kästchen
links benutzen, **Alle auswählen**, dann **Ausgewählte löschen**. Damit
verschwinden Konten und sämtliche Ergebnisse.

## Belohnung

Richtige Antworten werden gefeiert, und zwar abgestuft: ein kleiner Funkenflug
beim Treffer, ein größerer ab drei richtigen hintereinander, ein deutlich
größerer ab fünf. Auch das Lob wechselt. Eine Rückmeldung, die immer gleich
ausfällt, ist nach zwei Tagen Tapete.

Alles läuft über CSS-Animationen auf kurzlebigen Elementen – kein WebGL, keine
Bibliothek. Wer im Betriebssystem reduzierte Bewegung eingestellt hat, bekommt
die Effekte nicht zu sehen; die Sterne zählen trotzdem.

## Sterne

Ein Stern pro Tag. Dafür reicht eines von beidem:

- drei Viertel der Aufgaben einer Lektion richtig, oder
- fünf Minuten aktiv geübt

Gezählt wird nur die Zeit zwischen dem Erscheinen einer Aufgabe und der Antwort,
je Aufgabe auf 90 Sekunden gedeckelt. Ein liegen gelassenes Handy sammelt damit
keine Sterne.

Fünf Sterne in einer Kalenderwoche ergeben den Wochenstern. Wochenendtage zählen
mit, sind also Joker – wer in der Woche einen Tag verpasst, kann ihn nachholen.

In der Rangliste erzählt das Sternsymbol die ganze Woche:

| Symbol | Bedeutung |
|---|---|
| Gefüllter Stern | Wochenstern geschafft |
| Gefüllter Stern mit Schweif | Wochenstern und Wochenaufgabe |
| Hohler Stern mit Schweif | nur die Wochenaufgabe gelöst |
| Hohler Stern | noch unterwegs |

Sortiert wird nach Sternen, nicht nach Fehlerquote. Wer übt, kommt nach oben –
auch wer viel falsch macht. Das ist Absicht.

## Wochenaufgabe

Eine Textaufgabe auf höherem Niveau, die sich nicht im Kopf lösen lässt. Sie
wird in Schritten abgefragt, und jeder Schritt gibt erst den nächsten frei –
damit tatsächlich schriftlich gerechnet wird statt geraten. Angelegt wird sie
im Lehrerbereich unter *Wochenaufgabe*.

Damit die Schüler sie sehen, müssen Klasse, Jahr und Kalenderwoche passen.
Der Kasten oben auf der Seite sagt dir, ob für diese Woche eine aktiv ist und
für welche Klasse. Bei der Schreibweise der Klasse ist die Suche großzügig –
„9A" findet auch, wer in „9a" steht.

## Ein Kapitel ergänzen

1. Datei nach dem Muster von `kapitel/terme.js` in den Kapitelordner legen.
2. In `kapitel/index.json` eine Zeile ergänzen.

Anzeigename, Reihenfolge und ob ein Kapitel aktiv ist oder im Archiv liegt,
stellst du danach im Lehrerbereich unter *Kapitel* ein – ohne etwas zu pushen.

Archiviert heißt für die Schüler: weg. Weder in der Tagesaufgabe noch in der
Themenliste. Die Ergebnisse bleiben erhalten, und ein Zurückschalten macht das
Kapitel sofort wieder sichtbar.

Eine Kapiteldatei enthält vier Dinge:

| Feld | Wozu |
|---|---|
| `grundlagen` | Erklärungen, die über „Ich brauche die Erklärung" aufklappen |
| `vorlagen` | Aufgabengeneratoren; `erzeuge(r)` liefert bei jedem Aufruf neue Zahlen |
| `tagNamen` | Klartext für jede Teilkompetenz, erscheint in der Auswertung |
| `fehlerNamen` | Klartext für jeden Denkfehler hinter einer falschen Antwort |

Eine Vorlage sieht so aus:

```js
{
  id: 'rz-mult',
  titel: 'Multiplizieren mit Vorzeichen',
  tags: ['multiplizieren'],
  grundlage: 'vorzeichenregel',
  typ: 'mc',                       // 'mc' oder 'eingabe'
  erzeuge(r) {
    const a = r.int(2, 12) * r.vz();
    const b = r.int(2, 12) * r.vz();
    return {
      frage: `(${a}) · (${b}) =`,
      loesung: a * b,
      weg: 'Gleiche Vorzeichen ergeben ein positives Ergebnis.',
      ablenker: [
        { wert: -(a * b), fehler: 'vorzeichenregel-verdreht' },
        { wert: a + b,    fehler: 'operation-verwechselt' },
      ],
    };
  },
}
```

Jeder Ablenker trägt den Denkfehler, der zu ihm führt. Genau daraus entsteht
später der Satz „Vorzeichenregel verdreht – 23 mal in dieser Klasse" im
Lehrerbereich. Die App füllt auf mindestens sechs Antworten auf und mischt sie
bei jedem Aufruf neu.

## Wiederholung

Jede Vorlage wandert pro Schüler durch sieben Stufen. Richtig beantwortet rückt
sie vor und kommt nach 1, 2, 4, 8, 16 bzw. 30 Tagen wieder; falsch beantwortet
fällt sie auf null zurück und erscheint schon in der nächsten Lektion – dann mit
neuen Zahlen.

## Prüfen

```
node test.mjs
```

Baut jede Vorlage 400-mal, zeigt ein Beispiel und meldet doppelte Antworten,
mehrdeutige Lösungen und fehlende Klartexte.

## Dateien

```
index.html                     Schüler-App
lehrer.html                    Lehrerbereich
css/stil.css                   Aussehen der Schüler-App
css/lehrer.css                 Aussehen des Lehrerbereichs
js/config.js                   Zugangsdaten und Kursparameter
js/db.js                       Speichern, Laden, Anmeldung
js/engine.js                   Zufallszahlen, Aufgabenbau, Wiederholung, Auswertung
js/qr.js                       QR-Codes für die Streifen
js/fremd/                      übernommener Fremdcode mit Herkunftsangabe
js/app.js                      Ablauf der Schüler-App
js/effekte.js                  Funkenflug, Vibration, abgestuftes Lob
js/lehrer.js                   Ablauf des Lehrerbereichs
kapitel/index.json             Liste der Kapitel
kapitel/*.js                   die Kapitel selbst
setup/supabase.sql             Schema, Views und Zugriffsregeln
setup/edge-function/           Schülerverwaltung auf dem Server
test.mjs                       Prüfskript
```
