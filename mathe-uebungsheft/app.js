import { CONFIG } from './config.js';
import { DB } from './db.js';
import {
  ladeKapitelliste, ladeKapitel, baueAufgabe, waehleVorlagen,
  naechsteWiederholung, auswertungNachTag, wuerfel, startwert, heute,
} from './engine.js';

const $ = (id) => document.getElementById(id);

// Anzeige in deutscher Schreibweise: echtes Minuszeichen, Komma statt Punkt.
const anz = (wert) => String(wert).replace('-', '−').replace('.', ',');
const roh = (text) => text.replace(/[−–—]/g, '-').replace(',', '.').replace(/\s/g, '');
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
  ziel: { streak: 0, xp: 0, letzter_tag: null },
  lektion: null,
  auswahl: null,
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
    await DB.anmelden($('in-kuerzel').value, $('in-passwort').value);
    $('in-passwort').value = '';
    await startseite();
  } catch (fehler) {
    $('login-fehler').textContent = fehler.message;
    $('login-fehler').hidden = false;
  } finally {
    knopf.disabled = false;
  }
});

$('knopf-abmelden').addEventListener('click', () => {
  DB.abmelden();
  zeige('login');
});

/* ---------------- Startseite ---------------- */

async function startseite() {
  const nutzer = DB.nutzer();
  $('gruss').textContent = `Hallo ${nutzer.kuerzel}`;
  $('datum').textContent = new Date().toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' });

  [zustand.lernstand, zustand.versuche, zustand.ziel] = await Promise.all([
    DB.lernstandLaden(), DB.versucheLaden(), DB.zielLaden(),
  ]);

  const richtig = zustand.versuche.filter((v) => v.richtig).length;
  $('stat-streak').textContent = zustand.ziel.streak || 0;
  $('stat-xp').textContent = zustand.ziel.xp || 0;
  $('stat-quote').textContent = zustand.versuche.length
    ? `${Math.round((richtig / zustand.versuche.length) * 100)}%` : '–';

  const heuteFertig = zustand.ziel.letzter_tag === heute();
  $('tages-titel').textContent = heuteFertig ? 'Für heute erledigt' : 'Gemischt aus allen Kapiteln';
  $('tages-info').textContent = heuteFertig
    ? 'Du kannst weiterüben – es zählt für deine Punkte, aber deine Serie ist schon sicher.'
    : `${CONFIG.aufgabenProLektion} Aufgaben, ungefähr fünf Minuten. Enthält alles, was zur Wiederholung ansteht.`;
  $('tages-balken').style.width = heuteFertig ? '100%' : '0%';
  $('knopf-start').textContent = heuteFertig ? 'Noch eine Runde' : 'Loslegen';

  zeichneKapitel();
  zeichneDiagnose($('diagnose'), zustand.versuche, 4);
  zeige('start');
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
    $('in-antwort').value = '';
    $('in-antwort').focus({ preventScroll: true });
  }
}

// Antwort auswählen – solange nicht geprüft ist, kann beliebig umgewählt werden.
function waehle(option, knopf) {
  for (const b of $('antworten').children) b.classList.remove('gewaehlt');
  knopf.classList.add('gewaehlt');
  zustand.auswahl = { option, knopf };
  $('knopf-pruefen').disabled = false;
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

  const standNeu = l.protokoll.map((p) => ({
    kapitel: p.kapitel,
    vorlage: p.vorlage,
    ...naechsteWiederholung(zustand.lernstand[p.vorlage], p.richtig),
  }));
  for (const s of standNeu) zustand.lernstand[s.vorlage] = s;

  const vorher = zustand.ziel.letzter_tag;
  const gestern = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
  const ziel = {
    letzter_tag: heute(),
    xp: (zustand.ziel.xp || 0) + richtig * CONFIG.punkteProRichtig,
    streak: vorher === heute() ? zustand.ziel.streak
          : vorher === gestern ? (zustand.ziel.streak || 0) + 1 : 1,
  };
  zustand.ziel = ziel;
  zustand.versuche = [...l.protokoll, ...zustand.versuche];

  try {
    await Promise.all([
      DB.versucheSpeichern(l.protokoll),
      DB.lernstandSpeichern(standNeu),
      DB.zielSpeichern(ziel),
    ]);
  } catch (fehler) {
    console.warn('Speichern fehlgeschlagen:', fehler);
  }

  $('siegel').textContent = richtig >= l.aufgaben.length * 0.75 ? '✓' : '↻';
  $('siegel').style.background = richtig >= l.aufgaben.length * 0.75 ? 'var(--gruen)' : 'var(--tinte)';
  $('fertig-titel').textContent = `${richtig} von ${l.aufgaben.length} richtig`;
  $('fertig-text').textContent = richtig >= l.aufgaben.length * 0.75
    ? `Das war stark. ${richtig * CONFIG.punkteProRichtig} Punkte dazu.`
    : 'Die schwierigen kommen bald wieder – dann mit neuen Zahlen.';
  zeichneDiagnose($('fertig-diagnose'), l.protokoll, 3);
  zeige('fertig');
}

los().catch((fehler) => {
  document.body.innerHTML = `<div class="heft"><p class="fehlermeldung">Die Kapitel konnten nicht geladen werden: ${fehler.message}</p><p class="fussnote">Die Seite muss über eine Webadresse laufen, nicht als lokale Datei.</p></div>`;
});
