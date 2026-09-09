/* Kapitel: Prozentrechnung – zweites Beispiel, damit du siehst,
   wie ein weiteres Kapitel aufgebaut ist. */

export default {
  id: 'prozent',
  titel: 'Prozentrechnung',
  kurz: 'Anteile, Rabatte und Zuschläge',

  tagNamen: {
    'prozentwert': 'Prozentwert ausrechnen',
    'prozentsatz': 'Prozentsatz bestimmen',
    'grundwert': 'Grundwert zurückrechnen',
    'rabatt': 'Rabatt und Aufschlag',
    'sachaufgabe': 'Aus einem Text die Rechnung finden',
  },

  fehlerNamen: {
    'grundwert-verwechselt': 'Grundwert und Prozentwert wurden vertauscht',
    'komma-verschoben': 'das Komma sitzt eine Stelle daneben',
    'prozent-als-zahl': 'die Prozentzahl wurde direkt addiert oder subtrahiert',
    'differenz-statt-endwert': 'nur der Rabatt wurde ausgerechnet, nicht der neue Preis',
    'falsche-richtung': 'es wurde addiert statt abgezogen',
    'rechenfehler': 'ein Rechenfehler',
    'eigene-eingabe': 'eine selbst eingegebene Antwort',
  },

  grundlagen: [
    {
      id: 'grundidee',
      titel: 'Prozent heißt: von hundert',
      html: `
        <p>Ein Prozent ist ein Hundertstel. 25 % sind also 25 von 100 Teilen, oder anders gesagt: ein Viertel.</p>
        <p class="merksatz">Prozentwert = Grundwert · Prozentsatz : 100</p>
        <p>Der Grundwert ist immer das Ganze – der Preis vor dem Rabatt, die gesamte Klasse, der volle Betrag.</p>
        <p class="rechnung">20 % von 80 € = 80 · 20 : 100 = 16 €</p>`,
    },
    {
      id: 'zurueckrechnen',
      titel: 'Vom Anteil auf das Ganze schließen',
      html: `
        <p>Wenn du den Anteil kennst und das Ganze suchst, drehst du die Rechnung um.</p>
        <p class="merksatz">Grundwert = Prozentwert · 100 : Prozentsatz</p>
        <p class="rechnung">12 € sind 15 %<br>12 · 100 : 15 = 80 €</p>
        <p>Prüfe zum Schluss immer: Das Ganze muss größer sein als der Anteil.</p>`,
    },
    {
      id: 'rabatt',
      titel: 'Rabatt und Aufschlag in einem Schritt',
      html: `
        <p>Bei 20 % Rabatt bezahlst du nicht 20 %, sondern die restlichen 80 %.</p>
        <p class="merksatz">Neuer Preis = Grundwert · (100 − Rabatt) : 100</p>
        <p class="rechnung">60 € mit 20 % Rabatt<br>60 · 80 : 100 = 48 €</p>
        <p>Bei einem Aufschlag rechnest du genauso, nur mit 100 + Aufschlag.</p>`,
    },
  ],

  vorlagen: [
    {
      id: 'pr-prozentwert',
      titel: 'Prozentwert ausrechnen',
      tags: ['prozentwert'],
      grundlage: 'grundidee',
      typ: 'mc',
      erzeuge(r) {
        const p = r.waehle([5, 10, 20, 25, 50, 75]);
        const g = r.int(2, 20) * 20;
        const w = (g * p) / 100;
        return {
          satz: `Wie viel sind ${p} % von ${g} €?`,
          frage: `${g} € · ${p} %`,
          loesung: w,
          weg: `${g} · ${p} : 100 = ${w}`,
          ablenker: [
            { wert: w * 10, fehler: 'komma-verschoben' },
            { wert: p, fehler: 'grundwert-verwechselt' },
            { wert: g - p, fehler: 'prozent-als-zahl' },
            { wert: g - w, fehler: 'differenz-statt-endwert' },
            { wert: w + p, fehler: 'rechenfehler' },
          ],
        };
      },
    },

    {
      id: 'pr-prozentsatz',
      titel: 'Prozentsatz bestimmen',
      tags: ['prozentsatz'],
      grundlage: 'grundidee',
      typ: 'mc',
      erzeuge(r) {
        const p = r.waehle([10, 20, 25, 40, 50, 60, 75]);
        const g = r.waehle([20, 40, 60, 80, 200, 400]);
        const w = (g * p) / 100;
        return {
          satz: `${w} von ${g} Schülern haben die Aufgabe gelöst. Wie viel Prozent sind das?`,
          frage: `${w} von ${g}`,
          loesung: p,
          weg: `${w} · 100 : ${g} = ${p} %`,
          ablenker: [
            { wert: 100 - p, fehler: 'falsche-richtung' },
            { wert: w, fehler: 'grundwert-verwechselt' },
            { wert: g - w, fehler: 'grundwert-verwechselt' },
            { wert: p + 10, fehler: 'rechenfehler' },
            { wert: p * 2, fehler: 'rechenfehler' },
          ],
        };
      },
    },

    {
      id: 'pr-grundwert',
      titel: 'Grundwert zurückrechnen',
      tags: ['grundwert'],
      grundlage: 'zurueckrechnen',
      typ: 'mc',
      erzeuge(r) {
        const p = r.waehle([10, 20, 25, 50]);
        const g = r.int(2, 15) * 20;
        const w = (g * p) / 100;
        return {
          satz: `${w} € sind ${p} % des Preises. Wie teuer war die Ware vorher?`,
          frage: `${w} € = ${p} %`,
          loesung: g,
          weg: `${w} · 100 : ${p} = ${g} €`,
          ablenker: [
            { wert: w * p, fehler: 'grundwert-verwechselt' },
            { wert: w + p, fehler: 'prozent-als-zahl' },
            { wert: g / 10, fehler: 'komma-verschoben' },
            { wert: g * 10, fehler: 'komma-verschoben' },
            { wert: g - w, fehler: 'differenz-statt-endwert' },
          ],
        };
      },
    },

    {
      id: 'pr-rabatt',
      titel: 'Preis nach Rabatt',
      tags: ['rabatt', 'sachaufgabe'],
      grundlage: 'rabatt',
      typ: 'eingabe',
      erzeuge(r) {
        const p = r.waehle([10, 20, 25, 50]);
        const g = r.int(3, 20) * 20;
        const neu = (g * (100 - p)) / 100;
        return {
          satz: `Ein Kopfhörer kostet ${g} € und ist um ${p} % reduziert. Was bezahlst du?`,
          frage: `${g} € − ${p} %`,
          loesung: neu,
          weg: `${g} · ${100 - p} : 100 = ${neu} €. Du zahlst die restlichen ${100 - p} %.`,
        };
      },
    },
  ],
};
