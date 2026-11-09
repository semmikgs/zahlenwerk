/* Kapitel: Wurzeln – Einstiegsniveau
   Alles ist im Kopf lösbar. Die Obergrenze ist das teilweise Wurzelziehen.

   Das Wurzelzeichen bekommt einen Überstrich, damit auf dem Handy eindeutig
   ist, was noch unter der Wurzel steht. In den Antwortknöpfen steht reiner
   Text, dort genügt das Zeichen allein. */

/* Das Wurzelzeichen aus der Schriftart endet auf einer anderen Höhe als ein
   Überstrich aus CSS – der Haken hing dann unter dem Strich in der Luft.
   Deshalb wird es gezeichnet: Der Pfad endet genau oben rechts, dort setzt
   der Strich über dem Radikanden an. Beides wächst mit der Schriftgröße. */
const w = (inhalt) =>
  '<span class="wurzel">'
  + '<svg class="wurzel-zeichen" viewBox="0 0 10 22" preserveAspectRatio="none" aria-hidden="true">'
  + '<path d="M0.6 12.4 L3.1 12.4 L5.6 20.8 L9.7 0.9"/></svg>'
  + `<span class="wurzel-inhalt">${inhalt}</span></span>`;

// Eine Zahl vor der Wurzel, wie sie beim teilweisen Ziehen entsteht.
const vw = (vorn, rest) => `${vorn}${w(rest)}`;

// Quadratzahlen, die eine neunte Klasse im Kopf haben sollte.
const KLEIN = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
const GROSS = [16, 17, 18, 19, 20, 21, 22, 25, 30];

export default {
  id: 'wurzeln',
  titel: 'Wurzeln',
  kurz: 'Wurzeln im Kopf ziehen',

  tagNamen: {
    'quadratzahlen': 'Quadratzahlen erkennen',
    'wurzel-ziehen': 'Wurzel aus Quadratzahlen',
    'grosse-quadratzahlen': 'Wurzel aus größeren Quadratzahlen',
    'zehnerpotenzen': 'Wurzeln aus Zahlen mit Nullen',
    'dezimal-wurzel': 'Wurzel aus Dezimalzahlen',
    'bruch-wurzel': 'Wurzel aus Brüchen',
    'umkehrung': 'Quadrieren als Umkehrung',
    'abschaetzen': 'Wurzeln abschätzen',
    'teilweise-wurzel': 'Teilweise Wurzel ziehen',
    'wurzel-terme': 'Terme mit Wurzeln',
  },

  fehlerNamen: {
    'halbiert': 'statt der Wurzel wurde halbiert',
    'quadriert': 'quadriert statt die Wurzel gezogen',
    'nachbarquadrat': 'die Wurzel einer benachbarten Quadratzahl',
    'nullen-mitgezaehlt': 'die Nullen wurden einfach übernommen',
    'nullen-halbiert': 'bei den Nullen ging eine zu viel oder zu wenig weg',
    'komma-verschoben': 'das Komma sitzt eine Stelle daneben',
    'komma-vergessen': 'das Komma wurde ganz weggelassen',
    'nur-zaehler': 'nur der Zähler wurde gewurzelt',
    'nur-nenner': 'nur der Nenner wurde gewurzelt',
    'bruch-gedreht': 'Zähler und Nenner wurden vertauscht',
    'summe-gewurzelt': 'die Summe wurde unter einer Wurzel zusammengefasst',
    'faktor-nicht-gewurzelt': 'der herausgezogene Faktor wurde nicht gewurzelt',
    'faktoren-vertauscht': 'die beiden Zahlen wurden vertauscht',
    'rechenfehler': 'ein Rechenfehler',
    'eigene-eingabe': 'eine selbst eingegebene Antwort',
  },

  grundlagen: [
    {
      id: 'was-ist-wurzel',
      titel: 'Was eine Wurzel ist',
      html: `
        <p>Die Wurzel fragt rückwärts: <em>Welche Zahl ergibt mit sich selbst multipliziert das, was unter der Wurzel steht?</em></p>
        <p class="merksatz">Wurzelziehen macht das Quadrieren rückgängig.</p>
        <p class="rechnung">7 · 7 = 49&nbsp;&nbsp;→&nbsp;&nbsp;√49 = 7</p>
        <p>Deshalb hilft es nichts, die Zahl zu halbieren. <span class="nowrap">√36</span> ist nicht 18, sondern 6 – denn 6 · 6 = 36.</p>
        <p>Probe: Dein Ergebnis mit sich selbst malnehmen. Kommt die Zahl unter der Wurzel heraus, stimmt es.</p>`,
    },
    {
      id: 'quadratzahlen',
      titel: 'Die Quadratzahlen, die du kennen solltest',
      html: `
        <p>Wer diese Reihe im Kopf hat, zieht fast jede Wurzel in Sekunden.</p>
        <p class="rechnung">1 · 4 · 9 · 16 · 25 · 36 · 49<br>64 · 81 · 100 · 121 · 144 · 169<br>196 · 225 · 256 · 289 · 324 · 361 · 400</p>
        <p class="merksatz">Das sind die Quadrate von 1 bis 20.</p>
        <p>Steht eine dieser Zahlen unter der Wurzel, kennst du das Ergebnis sofort. Steht etwas anderes da, liegt die Wurzel zwischen zwei von ihnen.</p>`,
    },
    {
      id: 'zehnerpotenzen',
      titel: 'Wurzeln aus Zahlen mit Nullen',
      html: `
        <p>Große Zahlen mit Nullen zerlegst du in zwei Teile, aus denen du beide Wurzeln kennst.</p>
        <p class="merksatz">Zwei Nullen unter der Wurzel werden zu einer Null im Ergebnis.</p>
        <p class="rechnung">√1600 = √16 · √100 = 4 · 10 = 40</p>
        <p class="rechnung">√900 = √9 · √100 = 3 · 10 = 30</p>
        <p>Vorsicht: Aus 1600 wird 40, nicht 400. Von den zwei Nullen bleibt eine übrig.</p>`,
    },
    {
      id: 'dezimal',
      titel: 'Wurzeln aus Dezimalzahlen',
      html: `
        <p>Auch hier zählst du die Stellen hinter dem Komma – und halbierst ihre Anzahl.</p>
        <p class="merksatz">Zwei Stellen hinter dem Komma werden zu einer.</p>
        <p class="rechnung">√0,36 = 0,6&nbsp;&nbsp;denn&nbsp;&nbsp;0,6 · 0,6 = 0,36</p>
        <p class="rechnung">√0,0001 = 0,01</p>
        <p>Mach im Zweifel die Probe. <span class="nowrap">0,06 · 0,06</span> ergibt 0,0036 – das wäre also zu klein.</p>`,
    },
    {
      id: 'brueche',
      titel: 'Wurzeln aus Brüchen',
      html: `
        <p>Bei einem Bruch ziehst du oben und unten getrennt die Wurzel.</p>
        <p class="merksatz">Wurzel aus dem Zähler, Wurzel aus dem Nenner.</p>
        <p class="rechnung">√(16/9) = √16 / √9 = 4/3</p>
        <p class="rechnung">√(1/25) = 1/5</p>
        <p>Eines allein reicht nicht: Wer nur oben wurzelt, landet bei 4/9 – und das ist etwas ganz anderes.</p>`,
    },
    {
      id: 'abschaetzen',
      titel: 'Wurzeln abschätzen',
      html: `
        <p>Steht keine Quadratzahl unter der Wurzel, suchst du die beiden Quadratzahlen daneben.</p>
        <p class="merksatz">Zwischen welchen beiden Quadratzahlen liegt sie?</p>
        <p class="rechnung">36 &lt; 40 &lt; 49<br>also liegt √40 zwischen 6 und 7</p>
        <p>Das reicht fast immer: Du musst nicht rechnen, sondern nur die Reihe der Quadratzahlen kennen.</p>`,
    },
    {
      id: 'teilweise',
      titel: 'Teilweise die Wurzel ziehen',
      html: `
        <p>Manchmal steckt eine Quadratzahl als Faktor in der Zahl. Die darf nach vorn.</p>
        <p class="merksatz">Quadratzahl abspalten, ihre Wurzel vor das Zeichen schreiben.</p>
        <p class="rechnung">√50 = √25 · √2 = 5 · √2 = 5√2</p>
        <p class="rechnung">√12 = √4 · √3 = 2√3</p>
        <p>Vor der Wurzel steht die <em>gezogene</em> Zahl, nicht die Quadratzahl selbst: aus √50 wird 5√2 und nicht 25√2.</p>`,
    },
  ],

  vorlagen: [
    {
      id: 'wz-quadratzahl',
      titel: 'Wurzel aus einer Quadratzahl',
      tags: ['wurzel-ziehen', 'quadratzahlen'],
      grundlage: 'was-ist-wurzel',
      typ: 'mc',
      erzeuge(r) {
        const n = r.waehle(KLEIN);
        const q = n * n;
        return {
          frage: `${w(q)} =`,
          loesung: n,
          weg: `${n} · ${n} = ${q}.`,
          ablenker: [
            { wert: q / 2, fehler: 'halbiert' },
            { wert: q, fehler: 'quadriert' },
            { wert: n - 1, fehler: 'nachbarquadrat' },
            { wert: n + 1, fehler: 'nachbarquadrat' },
            { wert: n * 2, fehler: 'rechenfehler' },
          ],
        };
      },
    },

    {
      id: 'wz-gross',
      titel: 'Wurzel aus einer größeren Quadratzahl',
      tags: ['grosse-quadratzahlen', 'quadratzahlen'],
      grundlage: 'quadratzahlen',
      typ: 'mc',
      erzeuge(r) {
        const n = r.waehle(GROSS);
        const q = n * n;
        return {
          frage: `${w(q)} =`,
          loesung: n,
          weg: `${n} · ${n} = ${q}.`,
          ablenker: [
            { wert: n - 1, fehler: 'nachbarquadrat' },
            { wert: n + 1, fehler: 'nachbarquadrat' },
            { wert: n - 2, fehler: 'nachbarquadrat' },
            { wert: q / 2, fehler: 'halbiert' },
            { wert: n * 2, fehler: 'rechenfehler' },
          ],
        };
      },
    },

    {
      id: 'wz-zehner',
      titel: 'Wurzel aus einer Zahl mit Nullen',
      tags: ['zehnerpotenzen'],
      grundlage: 'zehnerpotenzen',
      typ: 'mc',
      erzeuge(r) {
        const n = r.waehle([2, 3, 4, 5, 6, 7, 8, 9, 12]);
        const q = n * n * 100;
        return {
          frage: `${w(q)} =`,
          loesung: n * 10,
          weg: `${q} = ${n * n} · 100, also ${n} · 10 = ${n * 10}.`,
          ablenker: [
            { wert: n * 100, fehler: 'nullen-mitgezaehlt' },
            { wert: n, fehler: 'nullen-halbiert' },
            { wert: q / 2, fehler: 'halbiert' },
            { wert: (n + 1) * 10, fehler: 'nachbarquadrat' },
            { wert: (n - 1) * 10, fehler: 'nachbarquadrat' },
          ],
        };
      },
    },

    {
      id: 'wz-dezimal',
      titel: 'Wurzel aus einer Dezimalzahl',
      tags: ['dezimal-wurzel'],
      grundlage: 'dezimal',
      typ: 'mc',
      erzeuge(r) {
        // Feste Paare statt gerechneter Kommazahlen – so entstehen keine
        // krummen Rundungsreste wie 0,30000000000000004.
        const [zahl, wurzel, danebenKomma, ohneKomma] = r.waehle([
          ['0,04', '0,2', '0,02', '2'],
          ['0,09', '0,3', '0,03', '3'],
          ['0,16', '0,4', '0,04', '4'],
          ['0,25', '0,5', '0,05', '5'],
          ['0,36', '0,6', '0,06', '6'],
          ['0,49', '0,7', '0,07', '7'],
          ['0,64', '0,8', '0,08', '8'],
          ['0,81', '0,9', '0,09', '9'],
          ['0,0001', '0,01', '0,001', '1'],
          ['0,0009', '0,03', '0,003', '3'],
          ['0,0004', '0,02', '0,002', '2'],
        ]);
        return {
          frage: `${w(zahl)} =`,
          loesung: wurzel,
          weg: `${wurzel} · ${wurzel} = ${zahl}.`,
          ablenker: [
            { wert: danebenKomma, fehler: 'komma-verschoben' },
            { wert: ohneKomma, fehler: 'komma-vergessen' },
            { wert: zahl, fehler: 'rechenfehler' },
            { wert: `0,${wurzel.slice(2)}5`, fehler: 'rechenfehler' },
            { wert: `${wurzel}0`, fehler: 'komma-verschoben' },
          ],
        };
      },
    },

    {
      id: 'wz-bruch',
      titel: 'Wurzel aus einem Bruch',
      tags: ['bruch-wurzel'],
      grundlage: 'brueche',
      typ: 'mc',
      erzeuge(r) {
        const [z, n] = r.waehle([
          [1, 4], [1, 25], [4, 9], [9, 16], [16, 9], [25, 36],
          [49, 64], [36, 49], [81, 400], [100, 9], [1, 100], [64, 25],
        ]);
        const zw = Math.round(Math.sqrt(z));
        const nw = Math.round(Math.sqrt(n));
        return {
          frage: `${w(`${z}/${n}`)} =`,
          loesung: `${zw}/${nw}`,
          weg: `Oben und unten getrennt: √${z} = ${zw}, √${n} = ${nw}.`,
          ablenker: (() => {
            // Ablenker werden nach ihrem Wert verglichen, nicht nach ihrer
            // Schreibweise: 2/4 ist dasselbe wie 1/2 und taugt deshalb nicht
            // als falsche Antwort. Brüche mit Nenner 1 werden als ganze Zahl
            // geschrieben, und 2/2 fliegt raus, weil dort schlicht 1 steht.
            const schreib = (oben, unten) => (unten === 1 ? `${oben}` : `${oben}/${unten}`);
            const kandidaten = [
              [zw, n, 'nur-zaehler'],
              [z, nw, 'nur-nenner'],
              [nw, zw, 'bruch-gedreht'],
              [z, n, 'rechenfehler'],
              [zw, nw + 1, 'rechenfehler'],
              [zw + 1, nw, 'rechenfehler'],
              [zw + 1, nw + 1, 'rechenfehler'],
              [zw, nw * 2, 'rechenfehler'],
              [zw * 2, nw, 'rechenfehler'],
              [zw, n * 2, 'rechenfehler'],
            ];
            const werte = new Set([zw / nw]);
            const liste = [];
            for (const [oben, unten, fehler] of kandidaten) {
              if (liste.length >= 5) break;
              if (oben === unten) continue;        // ergäbe nur 1
              const wert = oben / unten;
              if (werte.has(wert)) continue;
              werte.add(wert);
              liste.push({ wert: schreib(oben, unten), fehler });
            }
            return liste;
          })(),
        };
      },
    },

    {
      id: 'wz-umkehr',
      titel: 'Quadrieren als Gegenstück',
      tags: ['umkehrung', 'quadratzahlen'],
      grundlage: 'was-ist-wurzel',
      typ: 'eingabe',
      erzeuge(r) {
        const n = r.int(2, 20);
        return {
          satz: 'Welche Zahl ergibt das, wenn man sie mit sich selbst malnimmt?',
          frage: `? · ? = ${n * n}`,
          loesung: n,
          weg: `${n} · ${n} = ${n * n}, also ist ${n} die Wurzel.`,
        };
      },
    },

    {
      id: 'wz-abschaetzen',
      titel: 'Zwischen welchen Zahlen liegt die Wurzel?',
      tags: ['abschaetzen', 'quadratzahlen'],
      grundlage: 'abschaetzen',
      typ: 'mc',
      erzeuge(r) {
        const n = r.int(2, 14);
        const unten = n * n;
        const oben = (n + 1) * (n + 1);
        // Eine Zahl echt zwischen den beiden Quadratzahlen, nie genau darauf.
        const zahl = r.int(unten + 1, oben - 1);
        return {
          satz: 'Zwischen welchen beiden ganzen Zahlen liegt diese Wurzel?',
          frage: `${w(zahl)}`,
          loesung: `${n} und ${n + 1}`,
          weg: `${unten} < ${zahl} < ${oben}, also liegt die Wurzel zwischen ${n} und ${n + 1}.`,
          ablenker: (() => {
            // Alle Ablenker sind Spannen. Weil sie leicht aufeinanderfallen,
            // werden sie der Reihe nach gesammelt und doppelte verworfen,
            // bis fünf verschiedene zusammenkommen.
            const spanne = (von) => `${von} und ${von + 1}`;
            const halb = Math.floor(zahl / 2);
            const kandidaten = [
              [n - 1, 'nachbarquadrat'],
              [n + 1, 'nachbarquadrat'],
              [n + 2, 'nachbarquadrat'],
              [halb, 'halbiert'],
              [zahl - 1, 'rechenfehler'],
              [n + 3, 'nachbarquadrat'],
              [halb + 1, 'halbiert'],
              [zahl, 'rechenfehler'],
              [n + 4, 'rechenfehler'],
              [zahl + 1, 'rechenfehler'],
            ];
            const belegt = new Set([n]);
            const liste = [];
            for (const [von, fehler] of kandidaten) {
              if (liste.length >= 5) break;
              if (von < 1 || belegt.has(von)) continue;
              belegt.add(von);
              liste.push({ wert: spanne(von), fehler });
            }
            return liste;
          })(),
        };
      },
    },

    {
      id: 'wz-teilweise',
      titel: 'Teilweise die Wurzel ziehen',
      tags: ['teilweise-wurzel'],
      grundlage: 'teilweise',
      typ: 'mc',
      erzeuge(r) {
        // [Zahl unter der Wurzel, Faktor davor, Rest unter der Wurzel]
        const [zahl, vorn, rest] = r.waehle([
          [8, 2, 2], [12, 2, 3], [18, 3, 2], [20, 2, 5], [27, 3, 3],
          [32, 4, 2], [45, 3, 5], [48, 4, 3], [50, 5, 2], [72, 6, 2],
          [75, 5, 3], [98, 7, 2],
        ]);

        // Der Wert ist die Schreibweise für den Vergleich, die Anzeige die
        // gezeichnete Form mit Radikand unter dem Strich.
        const paar = (v, rst, fehler) => ({
          wert: `${v}√${rst}`, anzeige: vw(v, rst), fehler,
        });

        // Unter der Wurzel darf bei einem Ablenker keine Quadratzahl stehen:
        // 2√4 verrät sich auf den ersten Blick und taugt nicht als Köder.
        const istQuadrat = (n) => Number.isInteger(Math.sqrt(n));

        const kandidaten = [
          [vorn * vorn, rest, 'faktor-nicht-gewurzelt'],
          vorn !== rest ? [rest, vorn, 'faktoren-vertauscht'] : null,
          [vorn + 1, rest, 'rechenfehler'],
          [vorn, rest + 1, 'rechenfehler'],
          [vorn, rest * 2, 'rechenfehler'],
          vorn - 1 >= 2 ? [vorn - 1, rest, 'rechenfehler'] : null,
          [vorn + 2, rest, 'rechenfehler'],
          [vorn + 3, rest, 'rechenfehler'],
        ].filter(Boolean);

        const belegt = new Set([`${vorn}√${rest}`]);
        const ablenker = [];
        for (const [v, rst, fehler] of kandidaten) {
          if (ablenker.length >= 5) break;
          if (istQuadrat(rst)) continue;
          const schluessel = `${v}√${rst}`;
          if (belegt.has(schluessel)) continue;
          belegt.add(schluessel);
          ablenker.push(paar(v, rst, fehler));
        }
        // Reicht es nicht, hilft die gar nicht gezogene Zahl aus.
        if (ablenker.length < 5) ablenker.push({ wert: `${zahl}`, fehler: 'rechenfehler' });

        return {
          frage: `${w(zahl)} =`,
          loesung: `${vorn}√${rest}`,
          anzeige: vw(vorn, rest),
          weg: `${zahl} = ${vorn * vorn} · ${rest}, und √${vorn * vorn} = ${vorn}.`,
          ablenker,
        };
      },
    },

    {
      id: 'wz-term',
      titel: 'Wurzeln in einem Term',
      tags: ['wurzel-terme', 'wurzel-ziehen'],
      grundlage: 'was-ist-wurzel',
      typ: 'eingabe',
      erzeuge(r) {
        const a = r.int(2, 12);
        const b = r.int(2, 12);
        const plus = r.zahl() < 0.6 || a <= b;
        return plus
          ? {
              frage: `${w(a * a)} + ${w(b * b)} =`,
              loesung: a + b,
              weg: `√${a * a} = ${a} und √${b * b} = ${b}, zusammen ${a + b}.`,
            }
          : {
              frage: `${w(a * a)} − ${w(b * b)} =`,
              loesung: a - b,
              weg: `√${a * a} = ${a} und √${b * b} = ${b}, also ${a} − ${b} = ${a - b}.`,
            };
      },
    },

    {
      id: 'wz-mal',
      titel: 'Zwei Wurzeln malnehmen',
      tags: ['wurzel-terme'],
      grundlage: 'was-ist-wurzel',
      typ: 'mc',
      erzeuge(r) {
        const a = r.waehle([2, 3, 4, 5, 6, 7, 8, 9]);
        const b = r.waehle([2, 3, 4, 5, 6, 7, 8, 9]);
        return {
          frage: `${w(a * a)} · ${w(b * b)} =`,
          loesung: a * b,
          weg: `√${a * a} = ${a} und √${b * b} = ${b}, also ${a} · ${b} = ${a * b}.`,
          ablenker: [
            { wert: a + b, fehler: 'rechenfehler' },
            { wert: a * a * b * b, fehler: 'quadriert' },
            { wert: a * b + 1, fehler: 'rechenfehler' },
            { wert: a * b - 1, fehler: 'rechenfehler' },
            { wert: Math.max(a, b), fehler: 'rechenfehler' },
          ],
        };
      },
    },
  ],
};
