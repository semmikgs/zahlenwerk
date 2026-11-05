import { CONFIG } from './config.js?v=6';
import { DB, speicher, kalenderwoche } from './db.js?v=6';
import {
  ladeKapitelliste, ladeKapitel, baueAufgabe, waehleVorlagen,
  naechsteWiederholung, auswertungNachTag, wuerfel, startwert, heute,
} from './engine.js?v=6';

const $ = (id) => document.getElementById(id);

// Anzeige in deutscher Schreibweise: echtes Minuszeichen, Komma statt Punkt.
const anz = (wert) => String(wert).replace('-', '−').replace('.', ',');
const roh = (text) => text.replace(/[−–—]/g, '-').replace(',', '.').replace(/\s/g, '');
/* Aktive Übungszeit. Gezählt wird nur vom Erscheinen einer Aufgabe bis zur
   Antwort, je Aufgabe gedeckelt. Ein liegen gelassenes Handy sammelt damit
   keine Sterne, und wer kurz weggeschaut hat, verliert nicht alles. */
let aufgabeSeit = 0;
const uhrStarten = () => { aufgabeSeit = Date.now(); };
const uhrLesen = () => {
  if (!aufgabeSeit) return 0;
  const gemessen = Date.now() - aufgabeSeit;
  aufgabeSeit = 0;
  return Math.min(gemessen, CONFIG.maxDauerProAufgabeMs);
};
document.addEventListener('visibilitychange', () => {
  if (document.hidden) uhrLesen(); else uhrStarten();
});

const zeige = (name) => {
  document.querySelectorAll('.ansicht').forEach((a) => a.classList.remove('sichtbar'));
  $(`ansicht-${name}`).classList.add('sichtbar');
  window.scrollTo(0, 0);
};

const zustand = {
  kapitel: [],
  tagNamen: {},
  fehlerNamen: {},
  lernstand: {},
  versuche: [],
  sterne: [],
  lektion: null,
  auswahl: null,
  sofortPruefen: speicher.lies('sofort') === 'ja',
};

/* ---------------- Start ---------------- */

async function los() {
  const eintraege = await ladeKapitelliste();
  zustand.kapitel = await Promise.all(eintraege.map(ladeKapitel));
  for (const k of zustand.kapitel) {
    Object.assign(zustand.tagNamen, k.tagNamen || {});
    Object.assign(zustand.fehlerNamen, k.fehlerNamen || {});
  }
  if (DB.nutzer()) await startseite();
  else zeige('login');
}

$('form-login').addEventListener('submit', async (e) => {
  e.preventDefault();
  const knopf = e.target.querySelector('button');
  knopf.disabled = true;
  $('login-fehler').hidden = true;
  try {
    await DB.mitCode($('in-code').value);
    await startseite();
  } catch (fehler) {
    $('login-fehler').textContent = fehler.message;
    $('login-fehler').hidden = false;
  } finally {
    knopf.disabled = false;
  }
});

$('knopf-gast').addEventListener('click', async () => {
  DB.alsGast();
  await startseite();
});

$('knopf-gast-anmelden').addEventListener('click', () => {
  DB.abmelden();
  $('in-code').value = '';
  $('login-fehler').hidden = true;
  zeige('login');
});

$('schalter-sofort').checked = zustand.sofortPruefen;
$('schalter-sofort').addEventListener('change', (e) => {
  zustand.sofortPruefen = e.target.checked;
  speicher.schreib('sofort', e.target.checked ? 'ja' : 'nein');
});

$('knopf-abmelden').addEventListener('click', () => {
  DB.abmelden();
  zeige('login');
});

/* ---------------- Startseite ---------------- */

async function startseite() {
  const nutzer = DB.nutzer();
  $('gruss').textContent = nutzer.gast ? 'Üben ohne Code' : `Hallo ${nutzer.name || nutzer.code}`;
  $('gastband').hidden = !nutzer.gast;
  $('datum').textContent = new Date().toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' });

  [zustand.lernstand, zustand.versuche, zustand.sterne] = await Promise.all([
    DB.lernstandLaden(), DB.versucheLaden(), DB.sterneLaden(),
  ]);

  const richtig = zustand.versuche.filter((v) => v.richtig).length;
  const dieseWoche = sterneDieserWoche();
  $('stat-streak').textContent = `${dieseWoche}/${CONFIG.sterneProWoche}`;
  $('stat-xp').textContent = zustand.sterne.length;
  $('stat-quote').textContent = zustand.versuche.length
    ? `${Math.round((richtig / zustand.versuche.length) * 100)}%` : '–';

  const sternHeute = zustand.sterne.some((s) => s.tag === heute());
  const tag = tagesbilanz();

  $('tages-titel').textContent = sternHeute
    ? 'Stern für heute geholt'
    : 'Gemischt aus allen Kapiteln';

  if (sternHeute) {
    $('tages-info').textContent = dieseWoche >= CONFIG.sterneProWoche
      ? 'Der Wochenstern ist sicher. Weiterüben zählt trotzdem.'
      : `Noch ${CONFIG.sterneProWoche - dieseWoche} Sterne bis zum Wochenstern.`;
    $('tages-balken').style.width = '100%';
  } else if (tag.zeitMs > 0) {
    const fehlen = Math.max(0, CONFIG.sternZeitMs - tag.zeitMs);
    $('tages-info').textContent = fehlen < 90000
      ? `Fast geschafft – noch etwa ${Math.ceil(fehlen / 60000)} Minute und der Stern ist deiner.`
      : `${CONFIG.aufgabenProLektion} Aufgaben. Für den Stern: drei Viertel richtig oder fünf Minuten üben.`;
    $('tages-balken').style.width = `${Math.min(100, Math.round((tag.zeitMs / CONFIG.sternZeitMs) * 100))}%`;
  } else {
    $('tages-info').textContent = `${CONFIG.aufgabenProLektion} Aufgaben, ungefähr fünf Minuten. Enthält alles, was zur Wiederholung ansteht.`;
    $('tages-balken').style.width = '0%';
  }
  $('knopf-start').textContent = sternHeute ? 'Noch eine Runde' : 'Loslegen';

  $('version').textContent = 'Version 6' + (DB.nurLokal() ? ' · Stand nur auf diesem Gerät' : '');
  zeichneKapitel();
  zeichneDiagnose($('diagnose'), zustand.versuche, 4);
  zeige('start');
}

/* Wie viele Sterne liegen in der laufenden Kalenderwoche? */
function sterneDieserWoche() {
  const { jahr, kw } = kalenderwoche();
  return zustand.sterne.filter((s) => {
    const d = kalenderwoche(new Date(s.tag));
    return d.jahr === jahr && d.kw === kw;
  }).length;
}

/* Was wurde heute schon geschafft? Grundlage für den Tagesstern. */
function tagesbilanz() {
  const heuteStr = heute();
  const heutige = zustand.versuche.filter((v) => (v.erstellt || '').slice(0, 10) === heuteStr);
  return {
    anzahl: heutige.length,
    richtig: heutige.filter((v) => v.richtig).length,
    zeitMs: heutige.reduce((summe, v) => summe + (v.dauer_ms || 0), 0),
  };
}

function zeichneKapitel() {
  const liste = $('kapitelliste');
  liste.innerHTML = '';
  for (const k of zustand.kapitel) {
    const gesamt = k.vorlagen.length;
    const staerken = k.vorlagen.map((v) => Math.min(zustand.lernstand[v.id]?.box ?? 0, 3) / 3);
    const geuebt = staerken.filter((x) => x > 0).length;
    const sicher = staerken.filter((x) => x === 1).length;
    const anteil = staerken.reduce((a, b) => a + b, 0) / gesamt;

    const text = geuebt === 0
      ? `${gesamt} Aufgabentypen · noch nicht geübt`
      : `${geuebt} von ${gesamt} geübt · ${sicher} sitzen sicher`;

    const li = document.createElement('li');
    li.innerHTML = `
      <button type="button">
        ${ring(anteil)}
        <span>
          <strong>${k.titel}</strong>
          <small>${text}</small>
        </span>
      </button>`;
    li.querySelector('button').addEventListener('click', () => starteLektion([k]));
    liste.appendChild(li);
  }
}

const ring = (anteil) => {
  const u = 2 * Math.PI * 15;
  return `<svg class="ring" viewBox="0 0 36 36" aria-hidden="true">
    <circle cx="18" cy="18" r="15" fill="none" stroke="#D9E2EF" stroke-width="4"/>
    <circle cx="18" cy="18" r="15" fill="none" stroke="#1C3F7C" stroke-width="4"
      stroke-linecap="round" stroke-dasharray="${u}" stroke-dashoffset="${u * (1 - anteil)}"
      transform="rotate(-90 18 18)"/>
  </svg>`;
};

function zeichneDiagnose(ziel, versuche, anzahl) {
  const werte = auswertungNachTag(versuche, zustand.tagNamen);
  ziel.innerHTML = '';
  if (!werte.length) {
    ziel.innerHTML = '<li class="diagnose-leer">Übe eine Lektion, dann steht hier, was schon sitzt und was noch wackelt.</li>';
    return;
  }
  for (const w of werte.slice(0, anzahl)) {
    const li = document.createElement('li');
    li.className = w.stufe;
    li.innerHTML = `<span class="diagnose-name">${w.name}</span>
      <span class="diagnose-wert">${Math.round(w.quote * 100)}%</span>`;
    ziel.appendChild(li);
  }
}

/* ---------------- Lektion ---------------- */

$('knopf-start').addEventListener('click', () => starteLektion(zustand.kapitel));
$('knopf-abbrechen').addEventListener('click', () => startseite());
$('knopf-heim').addEventListener('click', () => startseite());
$('knopf-nochmal').addEventListener('click', () => {
  const l = zustand.lektion;
  starteLektion(l.quelle, l.runde + 1);
});

function starteLektion(kapitelAuswahl, runde = 0) {
  const nutzer = DB.nutzer();
  const seed = startwert(`${nutzer.id}|${heute()}|${runde}|${kapitelAuswahl.map((k) => k.id).join(',')}`);
  const r = wuerfel(seed);
  const paare = waehleVorlagen(kapitelAuswahl, zustand.lernstand, CONFIG.aufgabenProLektion, r);

  zustand.lektion = {
    id: (crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`),
    art: kapitelAuswahl.length === zustand.kapitel.length ? 'tages' : 'kapitel',
    quelle: kapitelAuswahl,
    runde,
    index: 0,
    protokoll: [],
    aufgaben: paare.map((p, i) =>
      baueAufgabe(p.kapitel, p.vorlage, startwert(`${seed}|${p.vorlage.id}|${i}`))),
  };
  zeige('uebung');
  zeichneAufgabe();
}

function zeichneAufgabe() {
  const l = zustand.lektion;
  const a = l.aufgaben[l.index];

  $('uebung-zaehler').textContent = `${l.index + 1}/${l.aufgaben.length}`;
  $('uebung-balken').style.width = `${(l.index / l.aufgaben.length) * 100}%`;
  $('aufgabe-thema').textContent = `${a.kapitelTitel} · ${a.thema}`;
  $('aufgabe-text').innerHTML = (a.satz ? `<span class="frage-satz">${a.satz}</span>` : '') + a.frage;
  $('rueckmeldung').hidden = true;
  $('knopf-hilfe').hidden = !a.grundlage;

  const felder = $('antworten');
  felder.innerHTML = '';
  const eingabe = $('form-eingabe');

  zustand.auswahl = null;
  $('in-antwort').value = '';
  const pruefKnopf = $('knopf-pruefen');

  if (a.typ === 'mc') {
    eingabe.hidden = true;
    pruefKnopf.hidden = false;
    pruefKnopf.disabled = true;
    for (const option of a.optionen) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'antwort';
      b.textContent = anz(option.wert);
      b.dataset.wert = option.wert;
      b.addEventListener('click', () => waehle(option, b));
      felder.appendChild(b);
    }
  } else {
    eingabe.hidden = false;
    pruefKnopf.hidden = true;
    $('form-eingabe').querySelector('button').disabled = false;
    $('in-antwort').focus({ preventScroll: true });
  }

  uhrStarten();
}

// Antwort auswählen – solange nicht geprüft ist, kann beliebig umgewählt werden.
function waehle(option, knopf) {
  const a = zustand.lektion.aufgaben[zustand.lektion.index];
  for (const b of $('antworten').children) b.classList.remove('gewaehlt');
  knopf.classList.add('gewaehlt');
  zustand.auswahl = { option, knopf };
  $('knopf-pruefen').disabled = false;
  if (zustand.sofortPruefen) pruefe(option.wert === a.loesung, option.fehler, knopf);
}

$('knopf-pruefen').addEventListener('click', () => {
  const wahl = zustand.auswahl;
  if (!wahl) return;
  const a = zustand.lektion.aufgaben[zustand.lektion.index];
  pruefe(wahl.option.wert === a.loesung, wahl.option.fehler, wahl.knopf);
});

$('form-eingabe').addEventListener('submit', (e) => {
  e.preventDefault();
  const a = zustand.lektion.aufgaben[zustand.lektion.index];
  const eingabe = roh($('in-antwort').value.trim());
  if (!eingabe) return;
  pruefe(eingabe === roh(a.loesung), null, null);
});

function pruefe(richtig, fehler, knopf) {
  const l = zustand.lektion;
  const a = l.aufgaben[l.index];

  if (a.typ === 'mc') {
    $('knopf-pruefen').hidden = true;
    for (const b of $('antworten').children) {
      b.disabled = true;
      b.classList.remove('gewaehlt');
      if (b.dataset.wert === a.loesung) b.classList.add('richtig');
    }
    if (!richtig && knopf) knopf.classList.add('falsch');
  } else {
    $('form-eingabe').querySelector('button').disabled = true;
  }

  l.protokoll.push({
    kapitel: a.kapitelId, vorlage: a.vorlageId, tags: a.tags,
    richtig, fehler: richtig ? null : (fehler || 'eigene-eingabe'),
    dauer_ms: uhrLesen(),
  });

  const feld = $('rueckmeldung');
  feld.className = `rueckmeldung ${richtig ? 'ja' : 'nein'}`;
  feld.hidden = false;
  $('rueckmeldung-titel').textContent = richtig
    ? ['Richtig.', 'Sitzt.', 'Genau so.', 'Stimmt.'][l.index % 4]
    : `Richtig wäre ${anz(a.loesung)}`;
  $('rueckmeldung-text').textContent = richtig
    ? (a.weg || '')
    : (fehler && zustand.fehlerNamen[fehler] ? `Typischer Stolperstein: ${zustand.fehlerNamen[fehler]}.` : a.weg || '');
  $('knopf-weiter').focus({ preventScroll: true });
}

$('knopf-weiter').addEventListener('click', async () => {
  const l = zustand.lektion;
  l.index++;
  if (l.index < l.aufgaben.length) {
    zeichneAufgabe();
  } else {
    await beendeLektion();
  }
});

$('knopf-hilfe').addEventListener('click', () => {
  const a = zustand.lektion.aufgaben[zustand.lektion.index];
  const kapitel = zustand.kapitel.find((k) => k.id === a.kapitelId);
  const g = kapitel?.grundlagen.find((x) => x.id === a.grundlage);
  if (!g) return;
  $('grundlage-titel').textContent = g.titel;
  $('grundlage-text').innerHTML = g.html;
  $('dialog-grundlage').showModal();
});
$('knopf-dialog-zu').addEventListener('click', () => $('dialog-grundlage').close());

async function beendeLektion() {
  const l = zustand.lektion;
  const richtig = l.protokoll.filter((p) => p.richtig).length;
  const quote = richtig / l.protokoll.length;
  const zeitLektion = l.protokoll.reduce((summe, p) => summe + (p.dauer_ms || 0), 0);

  const standNeu = l.protokoll.map((p) => ({
    kapitel: p.kapitel,
    vorlage: p.vorlage,
    ...naechsteWiederholung(zustand.lernstand[p.vorlage], p.richtig),
  }));
  for (const s of standNeu) zustand.lernstand[s.vorlage] = s;

  // Für die Tagesbilanz zählen die eben bearbeiteten Aufgaben mit.
  const jetzt = new Date().toISOString();
  zustand.versuche = [...l.protokoll.map((p) => ({ ...p, erstellt: jetzt })), ...zustand.versuche];

  const lektion = {
    id: l.id,
    tag: heute(),
    art: l.art,
    kapitel: l.art === 'kapitel' ? l.quelle[0].id : null,
    aufgaben: l.protokoll.length,
    richtig,
    aktive_zeit_ms: zeitLektion,
  };

  // Tagesstern: drei Viertel richtig in einer Lektion ODER fünf Minuten am Tag.
  const tag = tagesbilanz();
  const hatteSchonStern = zustand.sterne.some((s) => s.tag === heute());
  const durchQuote = quote >= CONFIG.sternQuote;
  const durchZeit = tag.zeitMs >= CONFIG.sternZeitMs;
  const sternNeu = !hatteSchonStern && (durchQuote || durchZeit);

  if (sternNeu) {
    const stern = {
      tag: heute(),
      grund: durchQuote ? 'quote' : 'zeit',
      quote: Math.round(quote * 1000) / 1000,
      zeit_ms: tag.zeitMs,
    };
    zustand.sterne = [stern, ...zustand.sterne];
  }

  try {
    await Promise.all([
      DB.versucheSpeichern(l.protokoll.map((p) => ({ ...p, lektion: l.id }))),
      DB.lernstandSpeichern(standNeu),
      DB.lektionSpeichern(lektion),
      sternNeu ? DB.sternSetzen(zustand.sterne[0]) : Promise.resolve(),
    ]);
  } catch (fehler) {
    console.warn('Speichern fehlgeschlagen:', fehler);
  }

  zeichneAbschluss({ richtig, quote, sternNeu, hatteSchonStern, tag, durchQuote });
}

function zeichneAbschluss({ richtig, quote, sternNeu, hatteSchonStern, tag, durchQuote }) {
  const l = zustand.lektion;
  const siegel = $('siegel');
  const inWoche = sterneDieserWoche();
  const fehlendeZeit = Math.max(0, CONFIG.sternZeitMs - tag.zeitMs);

  if (sternNeu) {
    siegel.textContent = '★';
    siegel.style.background = 'var(--gelb-stern)';
    $('fertig-titel').textContent = 'Stern verdient';
    $('fertig-text').textContent = inWoche >= CONFIG.sterneProWoche
      ? 'Damit steht der Wochenstern. Stark.'
      : durchQuote
        ? `${richtig} von ${l.protokoll.length} richtig. Noch ${CONFIG.sterneProWoche - inWoche} Sterne bis zum Wochenstern.`
        : `Fünf Minuten durchgehalten. Noch ${CONFIG.sterneProWoche - inWoche} Sterne bis zum Wochenstern.`;
  } else if (hatteSchonStern) {
    siegel.textContent = '✓';
    siegel.style.background = 'var(--gruen)';
    $('fertig-titel').textContent = `${richtig} von ${l.protokoll.length} richtig`;
    $('fertig-text').textContent = 'Den Stern für heute hattest du schon. Diese Runde zählt trotzdem für deinen Fortschritt.';
  } else {
    siegel.textContent = '↻';
    siegel.style.background = 'var(--tinte)';
    $('fertig-titel').textContent = `${richtig} von ${l.protokoll.length} richtig`;
    $('fertig-text').textContent = fehlendeZeit <= 120000
      ? `Übe weiter – noch etwa ${Math.max(1, Math.ceil(fehlendeZeit / 60000))} Minute, dann gibt es den Stern auch so.`
      : 'Für den Stern fehlt noch etwas: drei Viertel richtig oder fünf Minuten üben. Die schwierigen kommen gleich wieder, dann mit neuen Zahlen.';
  }

  zeichneDiagnose($('fertig-diagnose'), l.protokoll, 3);
  zeige('fertig');
}

los().catch((fehler) => {
  document.body.innerHTML = `<div class="heft"><p class="fehlermeldung">Die Kapitel konnten nicht geladen werden: ${fehler.message}</p><p class="fussnote">Die Seite muss über eine Webadresse laufen, nicht als lokale Datei.</p></div>`;
});
