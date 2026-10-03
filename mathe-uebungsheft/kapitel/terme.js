/* Kapitel: Terme zusammenfassen
   Bewusst sehr kleine Zahlen – alles soll im Kopf gehen. */

// Ein Glied wie "5a" oder "−3x" sauber schreiben.
const t = (zahl, v) => {
  if (zahl === 0) return '0';
  const vorzeichen = zahl < 0 ? '−' : '';
  return `${vorzeichen}${Math.abs(zahl)}${v}`;
};

export default {
  id: 'terme',
  titel: 'Terme zusammenfassen',
  kurz: 'Gleiches mit Gleichem verrechnen',

  tagNamen: {
    'gleiche-glieder': 'Gleiche Variablen zusammenfassen',
    'verschiedene-glieder': 'Verschiedene Variablen auseinanderhalten',
    'terme-minus': 'Terme mit Minus zusammenfassen',
    'zahlen-und-variablen': 'Zahlen und Variablen getrennt halten',
    'einsetzen': 'Eine Zahl in einen Term einsetzen',
  },

  fehlerNamen: {
    'koeffizienten-multipliziert': 'die Zahlen wurden multipliziert statt addiert',
    'exponent-erfunden': 'aus dem Zusammenfassen wurde eine Hochzahl gemacht',
    'variable-vergessen': 'die Variable ist im Ergebnis verschwunden',
    'nicht-zusammengefasst': 'der Term wurde gar nicht zusammengefasst',
    'alles-addiert': 'alles wurde in einen Topf geworfen',
    'falsche-zuordnung': 'die Zahlen wurden der falschen Variablen zugeordnet',
    'addiert-statt-subtrahiert': 'addiert statt subtrahiert',
    'vorzeichen-verdreht': 'das Ergebnis hat das falsche Vorzeichen',
    'zahl-zur-variablen': 'eine reine Zahl wurde an die Variable gehängt',
    'rechenfehler': 'ein Rechenfehler',
    'eigene-eingabe': 'eine selbst eingegebene Antwort',
  },

  grundlagen: [
    {
      id: 'gleiches-zu-gleichem',
      titel: 'Nur Gleiches lässt sich zusammenfassen',
      html: `
        <p>Ein Term wie <span class="nowrap">3a + 5a</span> bedeutet: drei Stück von <em>a</em> und noch fünf Stück von <em>a</em>. Zusammen sind das acht Stück.</p>
        <p class="merksatz">Die Zahlen davor werden addiert. Die Variable bleibt stehen, wie sie ist.</p>
        <p class="rechnung">3a + 5a = 8a</p>
        <p>Denk an Obst: 3 Äpfel und 5 Äpfel sind 8 Äpfel – nicht 15 Äpfel und auch keine Äpfel hoch zwei.</p>`,
    },
    {
      id: 'verschiedenes',
      titel: 'Was nicht zusammenpasst, bleibt getrennt',
      html: `
        <p>3 Äpfel und 4 Birnen kannst du nicht zu 7 Apfelbirnen machen. Genauso ist es bei Termen.</p>
        <p class="merksatz">Nur Glieder mit derselben Variablen darfst du zusammenfassen.</p>
        <p class="rechnung">4a + 3b + 2a = 6a + 3b</p>
        <p>Suche dir zuerst alle <em>a</em> zusammen, danach alle <em>b</em>. Reine Zahlen bilden eine dritte Gruppe.</p>`,
    },
    {
      id: 'terme-minus',
      titel: 'Terme mit Minus',
      html: `
        <p>Das Vorzeichen gehört immer zu der Zahl, die dahinter steht.</p>
        <p class="merksatz">7x − 3x heißt: sieben Stück, davon drei weg. Bleiben vier.</p>
        <p class="rechnung">7x − 3x = 4x<br>3x − 7x = −4x</p>
        <p>Wenn mehr weggenommen wird, als da ist, wird das Ergebnis negativ – genau wie beim Rechnen auf dem Zahlenstrahl.</p>`,
    },
    {
      id: 'einsetzen',
      titel: 'Eine Zahl einsetzen',
      html: `
        <p>Einsetzen heißt: Du ersetzt jeden Buchstaben durch die Zahl und rechnest aus.</p>
        <p class="merksatz">4x bedeutet 4 · x. Der Malpunkt wird nur nicht geschrieben.</p>
        <p class="rechnung">4x + 2 für x = 3<br>4 · 3 + 2 = 14</p>
        <p>Vergiss nicht: Punkt vor Strich. Erst 4 · 3, dann die 2 dazu.</p>`,
    },
  ],

  vorlagen: [
    {
      id: 'te-gleich',
      titel: 'Gleiche Variablen addieren',
      tags: ['gleiche-glieder'],
      grundlage: 'gleiches-zu-gleichem',
      typ: 'mc',
      erzeuge(r) {
        const v = r.waehle(['a', 'b', 'x', 'y']);
        let a = r.int(2, 9);
        let b = r.int(2, 9);
        if (a === 2 && b === 2) b = 5; // sonst wäre a+b gleich a·b
        return {
          frage: `${a}${v} + ${b}${v} =`,
          loesung: `${a + b}${v}`,
          weg: `${a} Stück und ${b} Stück sind ${a + b} Stück: ${a + b}${v}.`,
          ablenker: [
            { wert: `${a * b}${v}`, fehler: 'koeffizienten-multipliziert' },
            { wert: `${a + b}${v}²`, fehler: 'exponent-erfunden' },
            { wert: `${a + b}`, fehler: 'variable-vergessen' },
            { wert: `${a}${v} + ${b}${v}`, fehler: 'nicht-zusammengefasst' },
            { wert: `${Math.abs(a - b)}${v}`, fehler: 'rechenfehler' },
          ],
        };
      },
    },

    {
      id: 'te-minus',
      titel: 'Terme mit Minus zusammenfassen',
      tags: ['terme-minus', 'gleiche-glieder'],
      grundlage: 'terme-minus',
      typ: 'mc',
      erzeuge(r) {
        const v = r.waehle(['x', 'a', 'y']);
        let a = r.int(2, 12);
        let b = r.int(2, 12);
        if (a === b) b = a + 3;
        return {
          frage: `${a}${v} − ${b}${v} =`,
          loesung: t(a - b, v),
          weg: a > b
            ? `${a} Stück, davon ${b} weg: ${t(a - b, v)}.`
            : `Es wird mehr weggenommen als da ist, also wird das Ergebnis negativ: ${t(a - b, v)}.`,
          ablenker: [
            { wert: t(b - a, v), fehler: 'vorzeichen-verdreht' },
            { wert: t(a + b, v), fehler: 'addiert-statt-subtrahiert' },
            { wert: `${a - b}`, fehler: 'variable-vergessen' },
            { wert: `${a}${v} − ${b}${v}`, fehler: 'nicht-zusammengefasst' },
            { wert: t(a - b, `${v}²`), fehler: 'exponent-erfunden' },
          ],
        };
      },
    },

    {
      id: 'te-misch',
      titel: 'Zwei verschiedene Variablen',
      tags: ['verschiedene-glieder'],
      grundlage: 'verschiedenes',
      typ: 'mc',
      erzeuge(r) {
        const [v1, v2] = r.waehle([['a', 'b'], ['x', 'y'], ['a', 'x']]);
        const a1 = r.int(2, 7), a2 = r.int(2, 7);
        let b1 = r.int(2, 8);
        if (b1 === a2) b1 = a2 + 2; // sonst wäre ein Ablenker die richtige Antwort
        return {
          frage: `${a1}${v1} + ${b1}${v2} + ${a2}${v1} =`,
          loesung: `${a1 + a2}${v1} + ${b1}${v2}`,
          weg: `Erst die ${v1} sammeln: ${a1} + ${a2} = ${a1 + a2}. Die ${b1}${v2} bleiben für sich stehen.`,
          ablenker: [
            { wert: `${a1 + a2 + b1}${v1}${v2}`, fehler: 'alles-addiert' },
            { wert: `${a1 + a2 + b1}`, fehler: 'alles-addiert' },
            { wert: `${a1 + b1}${v1} + ${a2}${v2}`, fehler: 'falsche-zuordnung' },
            { wert: `${a1 + a2}${v2} + ${b1}${v1}`, fehler: 'falsche-zuordnung' },
            { wert: `${a1}${v1} + ${b1}${v2} + ${a2}${v1}`, fehler: 'nicht-zusammengefasst' },
          ],
        };
      },
    },

    {
      id: 'te-zahlen',
      titel: 'Zahlen und Variablen gemischt',
      tags: ['zahlen-und-variablen'],
      grundlage: 'verschiedenes',
      typ: 'mc',
      erzeuge(r) {
        const v = r.waehle(['a', 'x']);
        let a = r.int(2, 6), b = r.int(2, 6);
        if (a === 2 && b === 2) b = 5;
        let c = r.int(2, 9), d = r.int(2, 9);
        if (c === b) c = b + 1;
        if (c === 2 && d === 2) d = 5;
        return {
          frage: `${a}${v} + ${c} + ${b}${v} + ${d} =`,
          loesung: `${a + b}${v} + ${c + d}`,
          weg: `Die ${v} zusammen: ${a + b}${v}. Die Zahlen zusammen: ${c + d}.`,
          ablenker: [
            { wert: `${a + b + c + d}${v}`, fehler: 'zahl-zur-variablen' },
            { wert: `${a + b + c + d}`, fehler: 'alles-addiert' },
            { wert: `${a + c}${v} + ${b + d}`, fehler: 'falsche-zuordnung' },
            { wert: `${a * b}${v} + ${c + d}`, fehler: 'koeffizienten-multipliziert' },
            { wert: `${a + b}${v} + ${c * d}`, fehler: 'rechenfehler' },
          ],
        };
      },
    },

    {
      id: 'te-einsetzen',
      titel: 'Zahl in einen Term einsetzen',
      tags: ['einsetzen'],
      grundlage: 'einsetzen',
      typ: 'eingabe',
      erzeuge(r) {
        const a = r.int(2, 6);
        const b = r.int(1, 9);
        const x = r.int(2, 8);
        return {
          satz: `Setze x = ${x} ein.`,
          frage: `${a}x + ${b} =`,
          loesung: a * x + b,
          weg: `${a} · ${x} = ${a * x}, dann + ${b} = ${a * x + b}.`,
        };
      },
    },
  ],
};
