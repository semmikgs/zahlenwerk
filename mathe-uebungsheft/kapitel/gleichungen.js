/* Kapitel: Gleichungen umstellen und lösen
   Alle Lösungen sind ganze Zahlen und klein genug fürs Kopfrechnen. */

export default {
  id: 'gleichungen',
  titel: 'Gleichungen lösen',
  kurz: 'x allein auf eine Seite bringen',

  tagNamen: {
    'strich-umstellen': 'Plus und Minus auf die andere Seite bringen',
    'punkt-umstellen': 'Mal und Geteilt auf die andere Seite bringen',
    'zweischritt': 'Gleichungen in zwei Schritten lösen',
    'x-beidseitig': 'x steht auf beiden Seiten',
    'probe': 'Die Probe machen',
    'negative-loesung': 'Lösung ist negativ',
  },

  fehlerNamen: {
    'gegenoperation-falsch': 'auf beiden Seiten dasselbe getan statt das Gegenteil',
    'nur-eine-seite': 'nur eine Seite der Gleichung verändert',
    'mal-statt-geteilt': 'multipliziert statt dividiert',
    'reihenfolge-vertauscht': 'zuerst geteilt, obwohl die Zahl noch dazukam',
    'vorzeichen-verdreht': 'das Ergebnis hat das falsche Vorzeichen',
    'seiten-verwechselt': 'die beiden Seiten wurden vertauscht',
    'zahl-stehen-lassen': 'eine Zahl blieb bei x stehen',
    'rechenfehler': 'ein Rechenfehler',
    'eigene-eingabe': 'eine selbst eingegebene Antwort',
  },

  grundlagen: [
    {
      id: 'waage',
      titel: 'Eine Gleichung ist eine Waage',
      html: `
        <p>Links und rechts vom Gleichheitszeichen liegt gleich viel. Was du auf der einen Seite tust, musst du auch auf der anderen tun – sonst kippt die Waage.</p>
        <p class="merksatz">Das Ziel ist immer dasselbe: x soll allein stehen.</p>
        <p class="rechnung">x + 5 = 12&nbsp;&nbsp;| − 5<br>x = 7</p>
        <p>Der senkrechte Strich am Rand sagt, was du mit beiden Seiten machst. Das schreibt man immer dazu.</p>`,
    },
    {
      id: 'gegenteil',
      titel: 'Immer das Gegenteil rechnen',
      html: `
        <p>Um eine Zahl von x wegzubekommen, machst du das Gegenteil von dem, was dort steht.</p>
        <p class="merksatz">Plus weg mit Minus. Minus weg mit Plus. Mal weg mit Geteilt. Geteilt weg mit Mal.</p>
        <p class="rechnung">x − 4 = 9&nbsp;&nbsp;| + 4<br>x = 13</p>
        <p class="rechnung">6x = 42&nbsp;&nbsp;| : 6<br>x = 7</p>
        <p>Bei <span class="nowrap">6x = 42</span> steht zwischen 6 und x ein unsichtbarer Malpunkt. Deshalb wird geteilt.</p>`,
    },
    {
      id: 'zwei-schritte',
      titel: 'Zwei Schritte in der richtigen Reihenfolge',
      html: `
        <p>Steht bei x noch eine Zahl <em>und</em> ein Faktor, räumst du zuerst Plus und Minus weg, danach erst Mal und Geteilt.</p>
        <p class="merksatz">Erst Strich, dann Punkt – genau andersherum als beim Ausrechnen.</p>
        <p class="rechnung">3x + 4 = 19&nbsp;&nbsp;| − 4<br>3x = 15&nbsp;&nbsp;| : 3<br>x = 5</p>
        <p>Wenn du zuerst durch 3 teilst, müsstest du auch die 4 teilen. Das geht, ist aber unnötig kompliziert.</p>`,
    },
    {
      id: 'beide-seiten',
      titel: 'x steht auf beiden Seiten',
      html: `
        <p>Dann holst du zuerst alle x auf eine Seite – am besten dorthin, wo mehr davon stehen.</p>
        <p class="merksatz">x zur einen Seite, Zahlen zur anderen.</p>
        <p class="rechnung">5x = 2x + 9&nbsp;&nbsp;| − 2x<br>3x = 9&nbsp;&nbsp;| : 3<br>x = 3</p>`,
    },
    {
      id: 'probe',
      titel: 'Die Probe',
      html: `
        <p>Setze dein Ergebnis in die ursprüngliche Gleichung ein. Kommt links dasselbe heraus wie rechts, stimmt es.</p>
        <p class="merksatz">Die Probe kostet zehn Sekunden und findet fast jeden Fehler.</p>
        <p class="rechnung">3x + 4 = 19 mit x = 5<br>3 · 5 + 4 = 19 ✓</p>`,
    },
  ],

  vorlagen: [
    {
      id: 'gl-plus',
      titel: 'x plus eine Zahl',
      tags: ['strich-umstellen'],
      grundlage: 'waage',
      typ: 'mc',
      erzeuge(r) {
        const x = r.int(2, 15);
        const a = r.int(2, 12);
        return {
          satz: 'Wie groß ist x?',
          frage: `x + ${a} = ${x + a}`,
          loesung: x,
          weg: `Auf beiden Seiten ${a} abziehen: x = ${x}.`,
          ablenker: [
            { wert: x + 2 * a, fehler: 'gegenoperation-falsch' },
            { wert: x + a, fehler: 'nur-eine-seite' },
            { wert: a, fehler: 'seiten-verwechselt' },
            { wert: -x, fehler: 'vorzeichen-verdreht' },
            { wert: x + 1, fehler: 'rechenfehler' },
          ],
        };
      },
    },

    {
      id: 'gl-minus',
      titel: 'x minus eine Zahl',
      tags: ['strich-umstellen'],
      grundlage: 'gegenteil',
      typ: 'mc',
      erzeuge(r) {
        const x = r.int(3, 16);
        const a = r.int(2, 12);
        return {
          satz: 'Wie groß ist x?',
          frage: `x − ${a} = ${x - a}`,
          loesung: x,
          weg: `Auf beiden Seiten ${a} addieren: x = ${x}.`,
          ablenker: [
            { wert: x - 2 * a, fehler: 'gegenoperation-falsch' },
            { wert: x - a, fehler: 'nur-eine-seite' },
            { wert: a, fehler: 'seiten-verwechselt' },
            { wert: -x, fehler: 'vorzeichen-verdreht' },
            { wert: x - 1, fehler: 'rechenfehler' },
          ],
        };
      },
    },

    {
      id: 'gl-mal',
      titel: 'Eine Zahl mal x',
      tags: ['punkt-umstellen'],
      grundlage: 'gegenteil',
      typ: 'mc',
      erzeuge(r) {
        const a = r.int(2, 9);
        const x = r.int(2, 9);
        return {
          satz: 'Wie groß ist x?',
          frage: `${a}x = ${a * x}`,
          loesung: x,
          weg: `Beide Seiten durch ${a} teilen: x = ${x}.`,
          ablenker: [
            { wert: a * a * x, fehler: 'mal-statt-geteilt' },
            { wert: a * x - a, fehler: 'gegenoperation-falsch' },
            { wert: a * x, fehler: 'nur-eine-seite' },
            { wert: a, fehler: 'seiten-verwechselt' },
            { wert: x + 1, fehler: 'rechenfehler' },
          ],
        };
      },
    },

    {
      id: 'gl-zweischritt',
      titel: 'Erst Minus, dann Geteilt',
      tags: ['zweischritt', 'punkt-umstellen'],
      grundlage: 'zwei-schritte',
      typ: 'mc',
      erzeuge(r) {
        const a = r.int(2, 8);
        const x = r.int(2, 9);
        const b = r.int(2, 12);
        return {
          satz: 'Wie groß ist x?',
          frage: `${a}x + ${b} = ${a * x + b}`,
          loesung: x,
          weg: `Erst ${b} abziehen: ${a}x = ${a * x}. Dann durch ${a} teilen: x = ${x}.`,
          ablenker: [
            { wert: a * x, fehler: 'zahl-stehen-lassen' },
            { wert: x + b, fehler: 'reihenfolge-vertauscht' },
            { wert: a * x + b, fehler: 'nur-eine-seite' },
            { wert: x + 1, fehler: 'rechenfehler' },
            { wert: x - 1, fehler: 'rechenfehler' },
          ],
        };
      },
    },

    {
      id: 'gl-beide-seiten',
      titel: 'x auf beiden Seiten',
      tags: ['x-beidseitig', 'zweischritt'],
      grundlage: 'beide-seiten',
      typ: 'mc',
      erzeuge(r) {
        const x = r.int(2, 9);
        const klein = r.int(2, 5);
        const gross = klein + r.int(2, 5);
        const b = (gross - klein) * x;
        return {
          satz: 'Wie groß ist x?',
          frage: `${gross}x = ${klein}x + ${b}`,
          loesung: x,
          weg: `Erst ${klein}x abziehen: ${gross - klein}x = ${b}. Dann durch ${gross - klein} teilen: x = ${x}.`,
          ablenker: [
            { wert: b, fehler: 'zahl-stehen-lassen' },
            { wert: gross + klein, fehler: 'gegenoperation-falsch' },
            { wert: (gross + klein) * x, fehler: 'gegenoperation-falsch' },
            { wert: x + 1, fehler: 'rechenfehler' },
            { wert: x * 2, fehler: 'mal-statt-geteilt' },
          ],
        };
      },
    },

    {
      id: 'gl-negativ',
      titel: 'Lösung ist negativ',
      tags: ['negative-loesung', 'strich-umstellen'],
      grundlage: 'waage',
      typ: 'eingabe',
      erzeuge(r) {
        const x = -r.int(2, 12);
        const a = r.int(2, 14);
        return {
          satz: 'Wie groß ist x?',
          frage: `x + ${a} = ${x + a}`,
          loesung: x,
          weg: `${a} auf beiden Seiten abziehen: x = ${x}. Das Ergebnis liegt links von der Null.`,
        };
      },
    },

    {
      id: 'gl-probe',
      titel: 'Die Probe machen',
      tags: ['probe', 'zweischritt'],
      grundlage: 'probe',
      typ: 'eingabe',
      erzeuge(r) {
        const a = r.int(2, 6);
        const x = r.int(2, 9);
        const b = r.int(1, 10);
        return {
          satz: `Setze x = ${x} ein. Was steht links vom Gleichheitszeichen?`,
          frage: `${a}x + ${b}`,
          loesung: a * x + b,
          weg: `${a} · ${x} = ${a * x}, plus ${b} ergibt ${a * x + b}.`,
        };
      },
    },
  ],
};
