import { wuerfel, startwert, baueAufgabe } from './js/engine.js';
import rz from './kapitel/rationale-zahlen.js';
import pz from './kapitel/prozent.js';

let fehler = 0;
const meld = (m) => { console.log('  PROBLEM: ' + m); fehler++; };

for (const kapitel of [rz, pz]) {
  console.log(`\n== ${kapitel.titel} (${kapitel.vorlagen.length} Vorlagen) ==`);
  const grundlagenIds = new Set(kapitel.grundlagen.map(g => g.id));

  for (const v of kapitel.vorlagen) {
    if (v.grundlage && !grundlagenIds.has(v.grundlage)) meld(`${v.id}: Grundlage "${v.grundlage}" fehlt`);
    for (const t of v.tags) if (!kapitel.tagNamen[t]) meld(`${v.id}: Tag "${t}" hat keinen Klartext`);

    let beispiel = null;
    for (let i = 0; i < 400; i++) {
      const a = baueAufgabe(kapitel, v, startwert(`test|${v.id}|${i}`));
      if (i === 0) beispiel = a;
      if (a.loesung === 'undefined' || a.loesung === 'NaN') meld(`${v.id}: Lösung ungültig`);
      if (v.typ === 'mc') {
        if (a.optionen.length < 6) meld(`${v.id}: nur ${a.optionen.length} Antworten`);
        const treffer = a.optionen.filter(o => o.wert === a.loesung).length;
        if (treffer !== 1) meld(`${v.id}: ${treffer} richtige Antworten in der Liste`);
        const doppelt = new Set(a.optionen.map(o => o.wert)).size !== a.optionen.length;
        if (doppelt) meld(`${v.id}: doppelte Antwortmöglichkeit`);
        for (const o of a.optionen) if (o.fehler && !kapitel.fehlerNamen[o.fehler]) meld(`${v.id}: Fehlertyp "${o.fehler}" ohne Klartext`);
        if (/\./.test(a.loesung)) meld(`${v.id}: Lösung mit Komma: ${a.loesung}`);
      }
    }
    console.log(`  ${v.id.padEnd(22)} ${beispiel.satz ? beispiel.satz + '  ' : ''}${beispiel.frage.replace(/&nbsp;/g, ' ')} → ${beispiel.loesung}`);
  }
}

// Prüfen, dass verschiedene Startwerte verschiedene Aufgaben ergeben
const a1 = baueAufgabe(rz, rz.vorlagen[0], startwert('runde-0'));
const a2 = baueAufgabe(rz, rz.vorlagen[0], startwert('runde-1'));
if (a1.frage === a2.frage) meld('Wiederholung erzeugt identische Zahlen');

console.log(fehler ? `\n${fehler} Problem(e)` : '\nAlles in Ordnung.');
process.exit(fehler ? 1 : 0);
