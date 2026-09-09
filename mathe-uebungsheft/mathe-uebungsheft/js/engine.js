import { CONFIG } from './config.js';

/* ---------- Zufall mit Startwert -------------------------------------
   Gleicher Startwert = gleiche Aufgabe. Die Tageslektion ist dadurch für
   einen Schüler an einem Tag reproduzierbar; beim Wiederholen wird ein
   neuer Startwert benutzt, also kommen neue Zahlen. */

export function startwert(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function wuerfel(seed) {
  let a = seed >>> 0;
  const next = () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    zahl: next,
    int: (min, max) => min + Math.floor(next() * (max - min + 1)),
    waehle: (liste) => liste[Math.floor(next() * liste.length)],
    vz: () => (next() < 0.5 ? -1 : 1),
    mische: (liste) => {
      const a2 = liste.slice();
      for (let i = a2.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [a2[i], a2[j]] = [a2[j], a2[i]];
      }
      return a2;
    },
  };
}

/* ---------- Kapitel laden ------------------------------------------- */

export async function ladeKapitelliste() {
  const antwort = await fetch('kapitel/index.json', { cache: 'no-store' });
  if (!antwort.ok) throw new Error('kapitel/index.json nicht gefunden');
  return (await antwort.json()).kapitel;
}

const zwischenspeicher = new Map();

export async function ladeKapitel(eintrag) {
  if (zwischenspeicher.has(eintrag.id)) return zwischenspeicher.get(eintrag.id);
  const modul = await import(`../kapitel/${eintrag.datei}`);
  const kapitel = modul.default;
  zwischenspeicher.set(kapitel.id, kapitel);
  return kapitel;
}

/* ---------- Eine konkrete Aufgabe bauen ------------------------------ */

export function baueAufgabe(kapitel, vorlage, seed) {
  const r = wuerfel(seed);
  const roh = vorlage.erzeuge(r);
  const aufgabe = {
    kapitelId: kapitel.id,
    kapitelTitel: kapitel.titel,
    vorlageId: vorlage.id,
    thema: vorlage.titel,
    tags: vorlage.tags,
    grundlage: vorlage.grundlage,
    typ: vorlage.typ,
    frage: roh.frage,
    satz: roh.satz || '',
    loesung: String(roh.loesung),
    weg: roh.weg || '',
  };

  if (vorlage.typ === 'mc') {
    const ablenker = [];
    const gesehen = new Set([String(roh.loesung)]);
    for (const a of roh.ablenker) {
      const wert = String(a.wert);
      if (gesehen.has(wert)) continue;
      gesehen.add(wert);
      ablenker.push({ wert, fehler: a.fehler });
    }
    // Auf mindestens 5 Optionen auffüllen, damit Raten sich nicht lohnt.
    let schutz = 0;
    while (ablenker.length < 5 && schutz++ < 60) {
      const basis = Number(roh.loesung);
      if (!Number.isFinite(basis)) break;
      const abweichung = r.int(1, 9) * r.vz();
      const wert = String(basis + abweichung);
      if (gesehen.has(wert)) continue;
      gesehen.add(wert);
      ablenker.push({ wert, fehler: 'rechenfehler' });
    }
    const optionen = r.mische([
      { wert: String(roh.loesung), fehler: null },
      ...ablenker.slice(0, 5),
    ]);
    aufgabe.optionen = optionen;
  }

  return aufgabe;
}

/* ---------- Lektion zusammenstellen ---------------------------------- */

const heute = () => new Date().toISOString().slice(0, 10);

const tageDazu = (tage) => {
  const d = new Date();
  d.setDate(d.getDate() + tage);
  return d.toISOString().slice(0, 10);
};

/**
 * Wählt Vorlagen für eine Lektion: erst fällige Wiederholungen,
 * dann noch nicht Geübtes, dann alles Weitere.
 */
export function waehleVorlagen(kapitelListe, lernstand, anzahl = CONFIG.aufgabenProLektion, r) {
  const alle = [];
  for (const k of kapitelListe) {
    for (const v of k.vorlagen) alle.push({ kapitel: k, vorlage: v });
  }
  const heuteStr = heute();
  const faellig = [];
  const neu = [];
  const rest = [];

  for (const e of alle) {
    const stand = lernstand[e.vorlage.id];
    if (!stand) neu.push(e);
    else if (stand.faellig <= heuteStr) faellig.push(e);
    else rest.push(e);
  }

  const mischen = (liste) => (r ? r.mische(liste) : liste);
  const auswahl = [
    ...mischen(faellig),
    ...mischen(neu).slice(0, Math.max(2, Math.ceil(anzahl / 2))),
    ...mischen(rest),
  ];

  const ergebnis = [];
  for (const e of auswahl) {
    if (ergebnis.length >= anzahl) break;
    ergebnis.push(e);
  }
  // Falls es weniger Vorlagen als Aufgaben gibt: auffüllen.
  let i = 0;
  while (ergebnis.length < anzahl && alle.length) {
    ergebnis.push(alle[i % alle.length]);
    i++;
  }
  return ergebnis;
}

/** Leitner-Schritt nach einer Antwort. */
export function naechsteWiederholung(stand, richtig) {
  const box = richtig ? Math.min((stand?.box ?? 0) + 1, CONFIG.wiederholung.length - 1)
                      : 0;
  return { box, faellig: tageDazu(CONFIG.wiederholung[box]) };
}

/* ---------- Auswertung ----------------------------------------------- */

/**
 * Fasst Versuche zu einem Bild pro Teilkompetenz zusammen.
 * Rückgabe: [{ tag, name, versuche, richtig, quote, stufe }]
 */
export function auswertungNachTag(versuche, tagNamen) {
  const map = new Map();
  for (const v of versuche) {
    for (const tag of v.tags || []) {
      if (!map.has(tag)) map.set(tag, { tag, versuche: 0, richtig: 0 });
      const e = map.get(tag);
      e.versuche++;
      if (v.richtig) e.richtig++;
    }
  }
  return [...map.values()]
    .map((e) => {
      const quote = e.versuche ? e.richtig / e.versuche : 0;
      return {
        ...e,
        name: tagNamen[e.tag] || e.tag,
        quote,
        stufe: e.versuche < 3 ? 'mittel' : quote >= 0.8 ? 'stark' : quote >= 0.55 ? 'mittel' : 'schwach',
      };
    })
    .sort((a, b) => a.quote - b.quote);
}

/** Häufigste Denkfehler, aus den gewählten falschen Antworten. */
export function haeufigsteFehler(versuche, fehlerNamen) {
  const map = new Map();
  for (const v of versuche) {
    if (v.richtig || !v.fehler) continue;
    map.set(v.fehler, (map.get(v.fehler) || 0) + 1);
  }
  return [...map.entries()]
    .map(([fehler, anzahl]) => ({ fehler, anzahl, name: fehlerNamen[fehler] || fehler }))
    .sort((a, b) => b.anzahl - a.anzahl);
}

export { heute, tageDazu };
