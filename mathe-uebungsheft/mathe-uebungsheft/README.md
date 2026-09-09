# Mathe-Übungsheft

Ein Übungssystem für den Handybrowser: tägliche Lektion, Erklärungen auf Abruf,
automatische Wiederholung und eine Auswertung, die zeigt, an welchen
Teilkompetenzen es hakt.

## Sofort ausprobieren

1. Ordner in ein GitHub-Repository legen.
2. Unter *Settings → Pages* die Quelle auf `main / (root)` stellen.
3. Die Adresse auf dem Handy öffnen, ein beliebiges Kürzel und ein Passwort
   mit mindestens drei Zeichen eingeben.

Solange in `js/config.js` die Platzhalter stehen, läuft alles im **Übungsmodus**:
Fortschritt bleibt nur auf dem jeweiligen Gerät, du siehst als Lehrkraft nichts.
Zum Testen der Aufgaben reicht das vollkommen.

Die Seite muss über eine Webadresse laufen. Ein Doppelklick auf `index.html`
funktioniert nicht, weil Browser lokale Dateien nicht als Module laden.

## Mit Konten und Auswertung

1. Auf supabase.com ein kostenloses Projekt anlegen, als Region Frankfurt wählen.
2. Im SQL-Editor `setup/supabase.sql` einmal komplett ausführen.
3. Unter *Project Settings → API* die Project URL und den `anon`-Schlüssel
   kopieren und in `js/config.js` eintragen.
4. Unter *Authentication → Users* die Konten anlegen, als E-Mail
   `kuerzel@uebungsheft.local`, zum Beispiel `9a-14@uebungsheft.local`.
   Die Domain existiert nicht und wird nie angeschrieben.
5. Den auskommentierten `insert`-Block am Ende des SQL-Skripts anpassen und
   ausführen, damit jedes Konto seiner Klasse zugeordnet wird.
6. Dein eigenes Konto auf `rolle = 'lehrer'` setzen, dann `lehrer.html` öffnen.

Der `anon`-Schlüssel darf öffentlich im Repository stehen. Der Zugriff wird
nicht über den Schlüssel geregelt, sondern über die Zugriffsregeln in der
Datenbank: Schüler sehen ausschließlich ihre eigenen Zeilen.

Zwei Dinge zum Vormerken:

- Kostenlose Supabase-Projekte pausieren, wenn eine Woche lang niemand
  zugreift. Nach den Ferien einmal im Dashboard aufwecken.
- In der Datenbank stehen nur Kürzel und Übungsergebnisse, keine Namen. Die
  Zuordnung Kürzel → Schüler behältst du auf Papier oder in IServ.

## Ein Kapitel ergänzen

1. Datei nach dem Muster von `kapitel/rationale-zahlen.js` in den Ordner legen.
2. In `kapitel/index.json` eine Zeile ergänzen.

Mehr ist nicht nötig – die App liest die Liste beim Start.

Eine Kapiteldatei enthält vier Dinge:

| Feld | Wozu |
|---|---|
| `grundlagen` | Erklärungen, die über „Ich brauche die Erklärung“ aufklappen |
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
später der Satz „Division negativer Zahlen läuft schlechter als Multiplikation“
in der Lehreransicht. Die App füllt auf mindestens sechs Antworten auf, damit
Raten sich nicht lohnt, und mischt sie bei jedem Aufruf neu.

## Wiederholung

Jede Vorlage wandert pro Schüler durch sieben Stufen. Richtig beantwortet
rückt sie eine Stufe vor und kommt nach 1, 2, 4, 8, 16 bzw. 30 Tagen wieder.
Falsch beantwortet fällt sie auf Stufe null zurück und erscheint schon in der
nächsten Lektion – dann mit neuen Zahlen.

## Prüfen, ob die Aufgaben stimmen

```
node test.mjs
```

Das Skript baut jede Vorlage 400-mal, zeigt ein Beispiel und meldet doppelte
Antworten, mehrdeutige Lösungen und fehlende Klartexte.

## Dateien

```
index.html              Schüler-App
lehrer.html             Auswertung für dich
css/stil.css            gesamtes Aussehen
js/config.js            Supabase-Zugang und Kursparameter
js/db.js                Speichern und Laden
js/engine.js            Zufallszahlen, Aufgabenbau, Wiederholung, Auswertung
js/app.js               Ablauf der App
kapitel/index.json      Liste der Kapitel
kapitel/*.js            die Kapitel selbst
setup/supabase.sql      Tabellen und Zugriffsregeln
test.mjs                Prüfskript
```
