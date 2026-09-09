/* Kapitel: Rationale Zahlen
   Aufbau eines Kapitels:
     titel, kurz
     tagNamen     – Klartext für jede Teilkompetenz (erscheint in der Auswertung)
     fehlerNamen  – Klartext für jeden Denkfehler
     grundlagen   – aufklappbare Erklärungen, die zu einer Aufgabe gehören
     vorlagen     – Aufgabengeneratoren; erzeuge(r) liefert bei jedem Aufruf
                    neue Zahlen, damit Wiederholungen nie identisch sind
*/

const k = (n) => (n < 0 ? `(−${Math.abs(n)})` : String(n));

export default {
  id: 'rationale-zahlen',
  titel: 'Rationale Zahlen',
  kurz: 'Rechnen mit negativen Zahlen',

  tagNamen: {
    'addieren': 'Addieren negativer Zahlen',
    'subtrahieren': 'Subtrahieren negativer Zahlen',
    'null-uebergang': 'Rechnen über die Null hinweg',
    'minus-minus': 'Minus und Minus treffen aufeinander',
    'multiplizieren': 'Multiplizieren mit Vorzeichen',
    'dividieren': 'Dividieren mit Vorzeichen',
    'klammern': 'Minus vor der Klammer',
    'reihenfolge': 'Punkt vor Strich',
    'ordnen': 'Zahlen der Größe nach ordnen',
  },

  fehlerNamen: {
    'vorzeichen-ignoriert': 'das Vorzeichen wurde weggelassen',
    'vorzeichen-verdreht': 'das Ergebnis hat das falsche Vorzeichen',
    'betraege-addiert': 'beide Beträge wurden addiert, statt zu verrechnen',
    'betrag-statt-differenz': 'gerechnet wurde die kleinere von der größeren Zahl',
    'minus-minus-uebersehen': 'aus minus und minus wurde kein plus',
    'vorzeichenregel-verdreht': 'die Vorzeichenregel wurde vertauscht',
    'operation-verwechselt': 'es wurde addiert statt multipliziert',
    'klammer-nicht-aufgeloest': 'das Minus wirkt nur auf die erste Zahl in der Klammer',
    'reihenfolge-missachtet': 'von links nach rechts gerechnet statt Punkt vor Strich',
    'betrag-statt-wert': 'die Zahl mit dem größten Betrag wurde für die größte gehalten',
    'rechenfehler': 'ein Rechenfehler',
    'eigene-eingabe': 'eine selbst eingegebene Antwort',
  },

  grundlagen: [
    {
      id: 'zahlenstrahl',
      titel: 'Plus und Minus auf dem Zahlenstrahl',
      html: `
        <p>Stell dir eine Linie vor, auf der die Null in der Mitte liegt. Rechts davon stehen die positiven Zahlen, links die negativen.</p>
        <p class="merksatz">Plus heißt: nach rechts gehen. Minus heißt: nach links gehen.</p>
        <p>Bei <span class="nowrap">−7 + 4</span> startest du bei −7 und gehst 4 Schritte nach rechts. Du landest bei −3 – also immer noch links von der Null.</p>
        <p class="rechnung">−7 + 4 = −3</p>
        <p>Erst wenn du weiter nach rechts gehst, als du links gestartet bist, wird das Ergebnis positiv: <span class="nowrap">−7 + 10 = 3</span>.</p>`,
    },
    {
      id: 'minus-minus',
      titel: 'Wenn ein Minus auf ein Minus trifft',
      html: `
        <p>Ein Minus vor einer Zahl bedeutet: gehe nach links. Zwei Minuszeichen hintereinander drehen diese Richtung um.</p>
        <p class="merksatz">Minus und Minus zusammen ergeben Plus.</p>
        <p class="rechnung">5 − (−3) = 5 + 3 = 8</p>
        <p>Merkhilfe: „Etwas wegnehmen, das im Minus ist“ macht das Ergebnis größer – so wie das Streichen einer Schuld.</p>`,
    },
    {
      id: 'vorzeichenregel',
      titel: 'Vorzeichen beim Mal- und Geteiltrechnen',
      html: `
        <p>Beim Multiplizieren und Dividieren rechnest du zuerst ganz normal mit den Zahlen. Das Vorzeichen bestimmst du danach.</p>
        <p class="merksatz">Gleiche Vorzeichen ergeben Plus. Verschiedene Vorzeichen ergeben Minus.</p>
        <p class="rechnung">(−6) · (−4) = 24<br>(−6) · 4 = −24</p>
        <p>Vorsicht: Diese Regel gilt nur beim Mal- und Geteiltrechnen. Beim Plus- und Minusrechnen musst du auf dem Zahlenstrahl denken.</p>`,
    },
    {
      id: 'klammern',
      titel: 'Ein Minus vor der Klammer',
      html: `
        <p>Ein Minus vor einer Klammer wirkt auf <em>alles</em>, was in der Klammer steht – nicht nur auf die erste Zahl.</p>
        <p class="merksatz">Beim Auflösen dreht sich jedes Vorzeichen in der Klammer um.</p>
        <p class="rechnung">12 − (5 − 8) = 12 − 5 + 8 = 15</p>
        <p>Wenn du unsicher bist: rechne zuerst die Klammer aus. <span class="nowrap">5 − 8 = −3</span>, also <span class="nowrap">12 − (−3) = 15</span>. Beide Wege führen zum selben Ergebnis.</p>`,
    },
    {
      id: 'reihenfolge',
      titel: 'Punkt vor Strich',
      html: `
        <p>Mal- und Geteiltrechnen kommen immer vor Plus und Minus – auch dann, wenn negative Zahlen im Spiel sind.</p>
        <p class="merksatz">Erst Punkt, dann Strich. Klammern gehen noch davor.</p>
        <p class="rechnung">8 + 3 · (−5) = 8 + (−15) = −7</p>
        <p>Falsch wäre, zuerst 8 + 3 zu rechnen. Der Malpunkt bindet die 3 fest an die −5.</p>`,
    },
    {
      id: 'ordnen',
      titel: 'Welche negative Zahl ist größer?',
      html: `
        <p>Bei negativen Zahlen ist es umgekehrt als gewohnt: Je größer die Zahl hinter dem Minus aussieht, desto kleiner ist sie.</p>
        <p class="merksatz">Was weiter links auf dem Zahlenstrahl liegt, ist kleiner.</p>
        <p class="rechnung">−9 &lt; −2 &lt; 0 &lt; 3</p>
        <p>−9 liegt weiter links als −2, also ist −9 die kleinere Zahl, obwohl die 9 größer ist als die 2.</p>`,
    },
  ],

  vorlagen: [
    {
      id: 'rz-add-gleich',
      titel: 'Zwei negative Zahlen addieren',
      tags: ['addieren'],
      grundlage: 'zahlenstrahl',
      typ: 'mc',
      erzeuge(r) {
        const a = r.int(3, 19), b = r.int(3, 19);
        return {
          frage: `−${a} + ${k(-b)} =`,
          loesung: -(a + b),
          weg: `Beide Zahlen liegen links von der Null, du gehst also noch weiter nach links: −${a + b}.`,
          ablenker: [
            { wert: a + b, fehler: 'vorzeichen-ignoriert' },
            { wert: -(Math.abs(a - b)), fehler: 'betrag-statt-differenz' },
            { wert: a - b, fehler: 'vorzeichen-verdreht' },
            { wert: b - a, fehler: 'vorzeichen-verdreht' },
            { wert: -(a + b) + 1, fehler: 'rechenfehler' },
          ],
        };
      },
    },

    {
      id: 'rz-add-wechsel',
      titel: 'Über die Null hinweg addieren',
      tags: ['addieren', 'null-uebergang'],
      grundlage: 'zahlenstrahl',
      typ: 'eingabe',
      erzeuge(r) {
        const a = r.int(4, 18);
        const b = a + r.int(1, 14);
        const gedreht = r.zahl() < 0.5;
        return gedreht
          ? { frage: `−${b} + ${a} =`, loesung: a - b,
              weg: `Von −${b} aus ${a} Schritte nach rechts – du bleibst links von der Null: ${a - b}.` }
          : { frage: `−${a} + ${b} =`, loesung: b - a,
              weg: `Von −${a} aus ${b} Schritte nach rechts – du kommst über die Null: ${b - a}.` };
      },
    },

    {
      id: 'rz-sub-negativ',
      titel: 'Eine negative Zahl subtrahieren',
      tags: ['subtrahieren', 'minus-minus'],
      grundlage: 'minus-minus',
      typ: 'mc',
      erzeuge(r) {
        const a = r.int(2, 20) * r.vz(), b = r.int(2, 16);
        return {
          frage: `${a} − ${k(-b)} =`,
          loesung: a + b,
          weg: `Minus und Minus ergeben Plus: ${a} + ${b} = ${a + b}.`,
          ablenker: [
            { wert: a - b, fehler: 'minus-minus-uebersehen' },
            { wert: -(a + b), fehler: 'vorzeichen-verdreht' },
            { wert: b - a, fehler: 'vorzeichen-verdreht' },
            { wert: -a - b, fehler: 'minus-minus-uebersehen' },
            { wert: a + b + 2, fehler: 'rechenfehler' },
          ],
        };
      },
    },

    {
      id: 'rz-sub-wechsel',
      titel: 'Ergebnis wird negativ',
      tags: ['subtrahieren', 'null-uebergang'],
      grundlage: 'zahlenstrahl',
      typ: 'mc',
      erzeuge(r) {
        const a = r.int(3, 20);
        const b = a + r.int(2, 15);
        return {
          frage: `${a} − ${b} =`,
          loesung: a - b,
          weg: `Du gehst von ${a} aus ${b} Schritte nach links und landest bei ${a - b}.`,
          ablenker: [
            { wert: b - a, fehler: 'betrag-statt-differenz' },
            { wert: a + b, fehler: 'betraege-addiert' },
            { wert: -(a + b), fehler: 'betraege-addiert' },
            { wert: a - b - 1, fehler: 'rechenfehler' },
            { wert: a - b + 2, fehler: 'rechenfehler' },
          ],
        };
      },
    },

    {
      id: 'rz-mult',
      titel: 'Multiplizieren mit Vorzeichen',
      tags: ['multiplizieren'],
      grundlage: 'vorzeichenregel',
      typ: 'mc',
      erzeuge(r) {
        const a = r.int(2, 12) * r.vz();
        const b = r.int(2, 12) * r.vz();
        const l = a * b;
        return {
          frage: `${k(a)} · ${k(b)} =`,
          loesung: l,
          weg: a * b > 0
            ? 'Gleiche Vorzeichen ergeben ein positives Ergebnis.'
            : 'Verschiedene Vorzeichen ergeben ein negatives Ergebnis.',
          ablenker: [
            { wert: -l, fehler: 'vorzeichenregel-verdreht' },
            { wert: a + b, fehler: 'operation-verwechselt' },
            { wert: Math.abs(l), fehler: 'vorzeichen-ignoriert' },
            { wert: l + Math.abs(a), fehler: 'rechenfehler' },
            { wert: l - Math.abs(b), fehler: 'rechenfehler' },
          ],
        };
      },
    },

    {
      id: 'rz-div',
      titel: 'Dividieren mit Vorzeichen',
      tags: ['dividieren'],
      grundlage: 'vorzeichenregel',
      typ: 'mc',
      erzeuge(r) {
        const b = r.int(2, 12) * r.vz();
        const l = r.int(2, 12) * r.vz();
        const a = b * l;
        return {
          frage: `${k(a)} : ${k(b)} =`,
          loesung: l,
          weg: l > 0
            ? 'Gleiche Vorzeichen ergeben ein positives Ergebnis.'
            : 'Verschiedene Vorzeichen ergeben ein negatives Ergebnis.',
          ablenker: [
            { wert: -l, fehler: 'vorzeichenregel-verdreht' },
            { wert: Math.abs(l), fehler: 'vorzeichen-ignoriert' },
            { wert: l + 1, fehler: 'rechenfehler' },
            { wert: l - 2, fehler: 'rechenfehler' },
            { wert: a - b, fehler: 'operation-verwechselt' },
          ],
        };
      },
    },

    {
      id: 'rz-klammer',
      titel: 'Minus vor der Klammer',
      tags: ['klammern'],
      grundlage: 'klammern',
      typ: 'mc',
      erzeuge(r) {
        const a = r.int(5, 25), b = r.int(2, 15), c = r.int(2, 15);
        return {
          frage: `${a} − (${b} − ${c}) =`,
          loesung: a - b + c,
          weg: `Beim Auflösen drehen sich beide Vorzeichen in der Klammer um: ${a} − ${b} + ${c} = ${a - b + c}.`,
          ablenker: [
            { wert: a - b - c, fehler: 'klammer-nicht-aufgeloest' },
            { wert: a + b - c, fehler: 'klammer-nicht-aufgeloest' },
            { wert: a + b + c, fehler: 'betraege-addiert' },
            { wert: -(a - b + c), fehler: 'vorzeichen-verdreht' },
            { wert: a - b + c - 3, fehler: 'rechenfehler' },
          ],
        };
      },
    },

    {
      id: 'rz-punkt-vor-strich',
      titel: 'Punkt vor Strich mit negativen Zahlen',
      tags: ['reihenfolge', 'multiplizieren'],
      grundlage: 'reihenfolge',
      typ: 'eingabe',
      erzeuge(r) {
        const a = r.int(4, 20), b = r.int(2, 9), c = r.int(2, 9);
        return {
          frage: `${a} + ${b} · ${k(-c)} =`,
          loesung: a - b * c,
          weg: `Erst ${b} · (−${c}) = −${b * c}, dann ${a} − ${b * c} = ${a - b * c}.`,
        };
      },
    },

    {
      id: 'rz-ordnen',
      titel: 'Die kleinste Zahl finden',
      tags: ['ordnen'],
      grundlage: 'ordnen',
      typ: 'mc',
      erzeuge(r) {
        const kleinste = -r.int(12, 30);
        const zweite = -r.int(5, 11);
        const dritte = -r.int(1, 4);
        const positiv1 = r.int(1, 9);
        const positiv2 = r.int(10, 40);
        const gezeigt = r.mische([kleinste, zweite, dritte, positiv1, positiv2]);
        return {
          satz: 'Welche dieser Zahlen ist die kleinste?',
          frage: gezeigt.map((n) => (n < 0 ? `−${Math.abs(n)}` : n)).join('&nbsp;&nbsp; '),
          loesung: kleinste,
          weg: `${kleinste} liegt am weitesten links auf dem Zahlenstrahl.`,
          ablenker: [
            { wert: positiv2, fehler: 'betrag-statt-wert' },
            { wert: dritte, fehler: 'betrag-statt-wert' },
            { wert: zweite, fehler: 'betrag-statt-wert' },
            { wert: positiv1, fehler: 'betrag-statt-wert' },
            { wert: 0, fehler: 'betrag-statt-wert' },
          ],
        };
      },
    },
  ],
};
